// Draws a TreeLayout with react-native-svg: glowing gradient branches, photo leaves for
// finds, dashed silhouettes (with names) for undiscovered neighbors, and count bubbles
// for collapsed groups. Works on iOS, Android and the web.

import React, { memo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { radialLabel, type LayoutNode, type TreeLayout } from '../../core/tree/layout';
import type { VisibleNode } from '../../core/tree/visible';
import { colors, groupColor, mix } from '../../theme';

const R_FOUND = 17;
const R_COLLAPSED = 14;
const R_UNFOUND = 11;
const HIT_RADIUS = 24;

interface Props {
  layout: TreeLayout;
  /** Cover photo (data URI) per found taxon id; null when the photo wasn't kept. */
  covers: ReadonlyMap<string, string | null>;
  zoom: number;
  selectedId?: string | null;
  onPressNode(node: VisibleNode): void;
}

function truncate(text: string, max = 24): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Text with a dark outline so it stays readable over branches. */
function HaloText(props: React.ComponentProps<typeof SvgText> & { children: React.ReactNode }) {
  const { children, fill, ...rest } = props;
  return (
    <G>
      <SvgText {...rest} fill={colors.background} stroke={colors.background} strokeWidth={4} strokeLinejoin="round">
        {children}
      </SvgText>
      <SvgText {...rest} fill={fill}>
        {children}
      </SvgText>
    </G>
  );
}

function LeafLabel({ item, radius, fill, fontSize = 12, fontWeight = '400' }: {
  item: LayoutNode;
  radius: number;
  fill: string;
  fontSize?: number;
  fontWeight?: '400' | '600' | '700';
}) {
  const { rotation, anchor, flip } = radialLabel(item.angle);
  const suffix = item.node.kind === 'collapsed' ? `  ${item.node.hiddenCount}` : '';
  return (
    <G transform={`translate(${item.x}, ${item.y}) rotate(${rotation})`}>
      <HaloText
        x={flip ? -(radius + 7) : radius + 7}
        y={fontSize * 0.35}
        textAnchor={anchor}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fill={fill}
      >
        {truncate(item.node.label) + suffix}
      </HaloText>
    </G>
  );
}

function TreeViewImpl({ layout, covers, zoom, selectedId, onPressNode }: Props) {
  const byId = new Map(layout.nodes.map((n) => [n.node.id, n]));

  return (
    <Svg width={layout.width * zoom} height={layout.height * zoom} viewBox={`0 0 ${layout.width} ${layout.height}`}>
      <Defs>
        <LinearGradient id="trunk" x1="0" y1={layout.trunk.y2} x2="0" y2={layout.trunk.y1} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.text} stopOpacity="0" />
          <Stop offset="1" stopColor={colors.text} stopOpacity="0.9" />
        </LinearGradient>
        {layout.edges
          .filter((edge) => edge.depth === 1)
          .map((edge) => {
            const from = byId.get(edge.fromId)!;
            const to = byId.get(edge.toId)!;
            return (
              <LinearGradient
                key={`g-${edge.id}`}
                id={`g-${edge.toId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={colors.text} />
                <Stop offset="0.45" stopColor={groupColor(edge.groupId)} />
              </LinearGradient>
            );
          })}
        {layout.nodes
          .filter((n) => n.node.kind === 'found' && covers.get(n.node.id))
          .map((n) => (
            <ClipPath key={`c-${n.node.id}`} id={`c-${n.node.id}`}>
              <Circle cx={n.x} cy={n.y} r={R_FOUND} />
            </ClipPath>
          ))}
      </Defs>

      {/* Trunk */}
      <Path
        d={`M${layout.trunk.x1},${layout.trunk.y1} L${layout.trunk.x2},${layout.trunk.y2}`}
        stroke="url(#trunk)"
        strokeWidth={10}
        strokeLinecap="round"
      />

      {/* Branches: a wide faint stroke for the glow, then the bright core. */}
      {layout.edges.map((edge) => {
        const target = byId.get(edge.toId)!.node;
        const base = groupColor(edge.groupId);
        const stroke = edge.depth === 1 ? `url(#g-${edge.toId})` : mix(base, '#ffffff', Math.min(0.35, edge.depth * 0.07));
        const strength = target.kind === 'unfound' ? 0.32 : target.kind === 'collapsed' ? 0.7 : 1;
        const width = Math.max(1.4, 7.5 - edge.depth * 1.4) * (target.kind === 'unfound' ? 0.7 : 1);
        return (
          <G key={edge.id}>
            <Path d={edge.d} stroke={stroke} strokeOpacity={0.16 * strength} strokeWidth={width * 3.4} fill="none" strokeLinecap="round" />
            <Path d={edge.d} stroke={stroke} strokeOpacity={strength} strokeWidth={width} fill="none" strokeLinecap="round" />
          </G>
        );
      })}

      {/* Nodes */}
      {layout.nodes.map((item) => {
        const { node } = item;
        const color = groupColor(node.groupId);
        const selected = node.id === selectedId;
        const press = () => onPressNode(node);

        if (node.kind === 'root') {
          return (
            <G key={node.id}>
              <Circle cx={item.x} cy={item.y} r={20} fill={colors.text} fillOpacity={0.12} />
              <Circle cx={item.x} cy={item.y} r={8} fill={colors.text} />
              <HaloText x={item.x} y={layout.trunk.y2 + 16} textAnchor="middle" fontSize={13} fontWeight="600" fill={colors.textMuted} letterSpacing={2}>
                ANIMALS
              </HaloText>
            </G>
          );
        }

        if (node.kind === 'branch' || (node.kind === 'found' && !item.isLeaf)) {
          const label = node.kind === 'found' ? `${node.label} ✓` : node.label;
          return (
            <G key={node.id} onPress={press}>
              <Circle cx={item.x} cy={item.y} r={HIT_RADIUS} fill="rgba(0,0,0,0.01)" />
              {node.kind === 'found' && <Circle cx={item.x} cy={item.y} r={11} fill={color} fillOpacity={0.25} />}
              <Circle cx={item.x} cy={item.y} r={node.depth === 1 ? 6 : 4.5} fill={color} />
              <HaloText
                x={item.x}
                y={item.y - 12}
                textAnchor="middle"
                fontSize={node.depth === 1 ? 15 : 12.5}
                fontWeight={node.depth === 1 ? '700' : '600'}
                fill={color}
              >
                {truncate(label, 28)}
              </HaloText>
            </G>
          );
        }

        if (node.kind === 'collapsed') {
          return (
            <G key={node.id} onPress={press}>
              <Circle cx={item.x} cy={item.y} r={HIT_RADIUS} fill="rgba(0,0,0,0.01)" />
              <Circle
                cx={item.x}
                cy={item.y}
                r={R_COLLAPSED}
                fill={colors.surface}
                stroke={color}
                strokeWidth={selected ? 2.5 : 1.5}
                strokeOpacity={0.85}
              />
              <SvgText x={item.x} y={item.y + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>
                +
              </SvgText>
              <LeafLabel item={item} radius={R_COLLAPSED} fill={color} fontSize={node.depth === 1 ? 14 : 12} fontWeight="600" />
            </G>
          );
        }

        if (node.kind === 'found') {
          const cover = covers.get(node.id);
          return (
            <G key={node.id} onPress={press}>
              <Circle cx={item.x} cy={item.y} r={R_FOUND + 8} fill={color} fillOpacity={selected ? 0.35 : 0.18} />
              {cover ? (
                <SvgImage
                  href={cover}
                  x={item.x - R_FOUND}
                  y={item.y - R_FOUND}
                  width={R_FOUND * 2}
                  height={R_FOUND * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#c-${node.id})`}
                />
              ) : (
                <>
                  <Circle cx={item.x} cy={item.y} r={R_FOUND} fill={color} fillOpacity={0.85} />
                  <SvgText x={item.x} y={item.y + 5} textAnchor="middle" fontSize={14} fontWeight="700" fill={colors.background}>
                    {node.label.charAt(0).toUpperCase()}
                  </SvgText>
                </>
              )}
              <Circle cx={item.x} cy={item.y} r={R_FOUND} fill="none" stroke={color} strokeWidth={2.5} />
              <LeafLabel item={item} radius={R_FOUND + 4} fill={colors.text} fontSize={12.5} fontWeight="600" />
            </G>
          );
        }

        // Undiscovered neighbor: dashed silhouette ring with its name.
        return (
          <G key={node.id} onPress={press}>
            <Circle cx={item.x} cy={item.y} r={HIT_RADIUS} fill="rgba(0,0,0,0.01)" />
            <Circle
              cx={item.x}
              cy={item.y}
              r={R_UNFOUND}
              fill={colors.background}
              stroke={color}
              strokeOpacity={selected ? 0.9 : 0.45}
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />
            <SvgText x={item.x} y={item.y + 4} textAnchor="middle" fontSize={10} fill={colors.textFaint}>
              ?
            </SvgText>
            <LeafLabel item={item} radius={R_UNFOUND} fill={selected ? colors.text : colors.textMuted} fontSize={11} />
          </G>
        );
      })}
    </Svg>
  );
}

export const TreeView = memo(TreeViewImpl);
