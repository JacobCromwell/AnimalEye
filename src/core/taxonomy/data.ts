// Hand-curated seed tree for milestone 1: commonly encountered living animals, arranged
// in familiar groups (not strict phylogeny). A build pipeline will later generate a
// larger tree (~2,000 species) from public observation data with GBIF/iNaturalist IDs.
//
// Regions: NA = North & Central America, SA = South America, EU = Europe, AF = Africa,
// AS = Asia, OC = Oceania. "ALL" = widespread. Domestic animals and common pets appear
// in every region.

import type { NodeRank, RegionCode } from './types.ts';

export interface SeedNode {
  id?: string;
  common: string;
  sci?: string;
  rank: NodeRank;
  match?: string[];
  syn?: string[];
  regions?: RegionCode[];
  domestic?: boolean;
  pet?: boolean;
  children?: SeedNode[];
}

const ALL: RegionCode[] = ['NA', 'SA', 'EU', 'AF', 'AS', 'OC'];

function group(id: string, common: string, match: string[], children: SeedNode[]): SeedNode {
  return { id, common, rank: 'group', match, children };
}

function family(common: string, sci: string, children: SeedNode[], match: string[] = []): SeedNode {
  return { common, sci, rank: 'family', match, children };
}

function sp(
  common: string,
  sci: string,
  regions: RegionCode[] | 'ALL',
  opts: { syn?: string[]; domestic?: boolean; pet?: boolean } = {},
): SeedNode {
  return {
    common,
    sci,
    rank: 'species',
    regions: regions === 'ALL' ? ALL : regions,
    syn: opts.syn,
    domestic: opts.domestic,
    pet: opts.pet,
  };
}

/** Farm animals and pets bred by people. */
function dom(common: string, sci: string, syn?: string[]): SeedNode {
  return sp(common, sci, 'ALL', { domestic: true, syn });
}

/** Wild somewhere, but commonly kept as a pet everywhere. */
function pet(common: string, sci: string, regions: RegionCode[], syn?: string[]): SeedNode {
  return sp(common, sci, regions, { pet: true, syn });
}

// ---------------------------------------------------------------------------
// Mammals
// ---------------------------------------------------------------------------

const mammals = group('mammals', 'Mammals', ['Mammalia'], [
  group('carnivores', 'Carnivores', ['Carnivora'], [
    family('Cats', 'Felidae', [
      dom('House cat', 'Felis catus', ['Felis silvestris catus', 'Felis domesticus']),
      sp('Bobcat', 'Lynx rufus', ['NA']),
      sp('Mountain lion', 'Puma concolor', ['NA', 'SA']),
      sp('Eurasian lynx', 'Lynx lynx', ['EU', 'AS']),
      sp('Lion', 'Panthera leo', ['AF']),
      sp('Leopard', 'Panthera pardus', ['AF', 'AS']),
    ]),
    family('Dogs, wolves & foxes', 'Canidae', [
      dom('Dog', 'Canis familiaris', ['Canis lupus familiaris']),
      sp('Gray wolf', 'Canis lupus', ['NA', 'EU', 'AS']),
      sp('Coyote', 'Canis latrans', ['NA']),
      sp('Red fox', 'Vulpes vulpes', ['NA', 'EU', 'AS', 'AF', 'OC']),
      sp('Gray fox', 'Urocyon cinereoargenteus', ['NA', 'SA']),
      sp('Golden jackal', 'Canis aureus', ['EU', 'AS']),
    ]),
    family('Bears', 'Ursidae', [
      sp('American black bear', 'Ursus americanus', ['NA']),
      sp('Brown bear', 'Ursus arctos', ['NA', 'EU', 'AS']),
    ]),
    family('Weasels, otters & badgers', 'Mustelidae', [
      sp('North American river otter', 'Lontra canadensis', ['NA']),
      sp('Eurasian otter', 'Lutra lutra', ['EU', 'AS']),
      sp('European badger', 'Meles meles', ['EU', 'AS']),
      sp('Stoat', 'Mustela erminea', ['NA', 'EU', 'AS']),
      sp('American mink', 'Neogale vison', ['NA', 'EU'], { syn: ['Neovison vison', 'Mustela vison'] }),
      dom('Ferret', 'Mustela furo'),
    ]),
    family('Raccoons', 'Procyonidae', [sp('Raccoon', 'Procyon lotor', ['NA', 'EU'])]),
    family('Skunks', 'Mephitidae', [sp('Striped skunk', 'Mephitis mephitis', ['NA'])]),
  ]),
  group('marine-mammals', 'Marine mammals', [
    'Pinnipedia', 'Cetacea', 'Odobenidae', 'Phocoenidae', 'Monodontidae', 'Physeteridae', 'Balaenidae',
    'Eschrichtiidae', 'Sirenia', 'Trichechidae',
  ], [
    family('Seals', 'Phocidae', [
      sp('Harbor seal', 'Phoca vitulina', ['NA', 'EU']),
      sp('Grey seal', 'Halichoerus grypus', ['NA', 'EU']),
    ]),
    family('Sea lions', 'Otariidae', [sp('California sea lion', 'Zalophus californianus', ['NA'])]),
    family('Dolphins', 'Delphinidae', [sp('Common bottlenose dolphin', 'Tursiops truncatus', 'ALL')]),
    family('Rorquals', 'Balaenopteridae', [sp('Humpback whale', 'Megaptera novaeangliae', 'ALL')]),
  ]),
  group('hoofed-mammals', 'Hoofed mammals', ['Artiodactyla', 'Perissodactyla', 'Cetartiodactyla'], [
    family('Deer', 'Cervidae', [
      sp('White-tailed deer', 'Odocoileus virginianus', ['NA', 'SA']),
      sp('Mule deer', 'Odocoileus hemionus', ['NA']),
      sp('Elk', 'Cervus canadensis', ['NA', 'AS']),
      sp('Red deer', 'Cervus elaphus', ['EU', 'AS', 'OC']),
      sp('Roe deer', 'Capreolus capreolus', ['EU', 'AS']),
      sp('Fallow deer', 'Dama dama', ['EU']),
      sp('Moose', 'Alces alces', ['NA', 'EU', 'AS']),
    ]),
    family('Cattle, sheep & goats', 'Bovidae', [
      dom('Cattle', 'Bos taurus', ['Bos primigenius taurus']),
      dom('Goat', 'Capra hircus', ['Capra aegagrus hircus']),
      dom('Sheep', 'Ovis aries'),
      sp('American bison', 'Bison bison', ['NA']),
      sp('Mountain goat', 'Oreamnos americanus', ['NA']),
      sp('Impala', 'Aepyceros melampus', ['AF']),
    ]),
    family('Horses & zebras', 'Equidae', [
      dom('Horse', 'Equus caballus', ['Equus ferus caballus']),
      dom('Donkey', 'Equus asinus', ['Equus africanus asinus']),
      sp('Plains zebra', 'Equus quagga', ['AF']),
    ]),
    family('Pigs', 'Suidae', [
      dom('Pig', 'Sus domesticus', ['Sus scrofa domesticus']),
      sp('Wild boar', 'Sus scrofa', ['EU', 'AS', 'NA']),
      sp('Common warthog', 'Phacochoerus africanus', ['AF']),
    ]),
    family('Giraffes', 'Giraffidae', [sp('Giraffe', 'Giraffa camelopardalis', ['AF'])]),
    family('Hippos', 'Hippopotamidae', [sp('Common hippopotamus', 'Hippopotamus amphibius', ['AF'])]),
    family('Camels & llamas', 'Camelidae', [
      dom('Llama', 'Lama glama'),
      dom('Dromedary camel', 'Camelus dromedarius'),
    ]),
  ]),
  group('elephants', 'Elephants', ['Proboscidea', 'Elephantidae'], [
    sp('African bush elephant', 'Loxodonta africana', ['AF']),
    sp('Asian elephant', 'Elephas maximus', ['AS']),
  ]),
  group('primates', 'Primates', ['Primates'], [
    family('Old World monkeys', 'Cercopithecidae', [
      sp('Rhesus macaque', 'Macaca mulatta', ['AS']),
      sp('Vervet monkey', 'Chlorocebus pygerythrus', ['AF']),
      sp('Chacma baboon', 'Papio ursinus', ['AF']),
    ]),
    family('Great apes', 'Hominidae', [sp('Chimpanzee', 'Pan troglodytes', ['AF'])]),
  ]),
  group('rodents', 'Rodents', ['Rodentia'], [
    family('Squirrels', 'Sciuridae', [
      sp('Eastern gray squirrel', 'Sciurus carolinensis', ['NA', 'EU']),
      sp('Fox squirrel', 'Sciurus niger', ['NA']),
      sp('Red squirrel', 'Sciurus vulgaris', ['EU', 'AS']),
      sp('American red squirrel', 'Tamiasciurus hudsonicus', ['NA']),
      sp('Eastern chipmunk', 'Tamias striatus', ['NA']),
      sp('Groundhog', 'Marmota monax', ['NA']),
      sp('Black-tailed prairie dog', 'Cynomys ludovicianus', ['NA']),
    ]),
    family('Mice & rats', 'Muridae', [
      sp('House mouse', 'Mus musculus', 'ALL'),
      sp('Brown rat', 'Rattus norvegicus', 'ALL'),
      sp('Black rat', 'Rattus rattus', 'ALL'),
    ]),
    family('Voles, hamsters & deer mice', 'Cricetidae', [
      sp('Eastern deer mouse', 'Peromyscus maniculatus', ['NA']),
      sp('White-footed mouse', 'Peromyscus leucopus', ['NA']),
      sp('Meadow vole', 'Microtus pennsylvanicus', ['NA']),
      sp('Muskrat', 'Ondatra zibethicus', ['NA', 'EU']),
      dom('Golden hamster', 'Mesocricetus auratus'),
    ]),
    family('Beavers', 'Castoridae', [
      sp('North American beaver', 'Castor canadensis', ['NA']),
      sp('Eurasian beaver', 'Castor fiber', ['EU', 'AS']),
    ]),
    family('Cavies & capybaras', 'Caviidae', [
      dom('Guinea pig', 'Cavia porcellus'),
      sp('Capybara', 'Hydrochoerus hydrochaeris', ['SA']),
    ]),
    family('New World porcupines', 'Erethizontidae', [
      sp('North American porcupine', 'Erethizon dorsatum', ['NA']),
    ]),
  ]),
  family('Rabbits & hares', 'Leporidae', [
    sp('Eastern cottontail', 'Sylvilagus floridanus', ['NA']),
    dom('European rabbit', 'Oryctolagus cuniculus'),
    sp('European hare', 'Lepus europaeus', ['EU']),
    sp('Snowshoe hare', 'Lepus americanus', ['NA']),
    sp('Black-tailed jackrabbit', 'Lepus californicus', ['NA']),
  ], ['Lagomorpha']),
  group('bats', 'Bats', ['Chiroptera'], [
    sp('Big brown bat', 'Eptesicus fuscus', ['NA']),
    sp('Little brown bat', 'Myotis lucifugus', ['NA']),
    sp('Mexican free-tailed bat', 'Tadarida brasiliensis', ['NA', 'SA']),
    sp('Common pipistrelle', 'Pipistrellus pipistrellus', ['EU']),
    sp('Grey-headed flying fox', 'Pteropus poliocephalus', ['OC']),
  ]),
  group('insectivores', 'Hedgehogs, shrews & moles', ['Eulipotyphla', 'Erinaceidae', 'Soricidae', 'Talpidae'], [
    sp('European hedgehog', 'Erinaceus europaeus', ['EU']),
    pet('Four-toed hedgehog', 'Atelerix albiventris', ['AF']),
    sp('Eastern mole', 'Scalopus aquaticus', ['NA']),
    sp('European mole', 'Talpa europaea', ['EU']),
    sp('Northern short-tailed shrew', 'Blarina brevicauda', ['NA']),
    sp('Common shrew', 'Sorex araneus', ['EU', 'AS']),
  ]),
  group('marsupials', 'Marsupials', ['Marsupialia', 'Didelphimorphia', 'Diprotodontia'], [
    sp('Virginia opossum', 'Didelphis virginiana', ['NA']),
    sp('Eastern grey kangaroo', 'Macropus giganteus', ['OC']),
    sp('Red kangaroo', 'Osphranter rufus', ['OC'], { syn: ['Macropus rufus'] }),
    sp('Koala', 'Phascolarctos cinereus', ['OC']),
    sp('Common brushtail possum', 'Trichosurus vulpecula', ['OC']),
    sp('Common wombat', 'Vombatus ursinus', ['OC']),
  ]),
]);

// ---------------------------------------------------------------------------
// Birds
// ---------------------------------------------------------------------------

const birds = group('birds', 'Birds', ['Aves'], [
  group('songbirds', 'Songbirds', ['Passeriformes'], [
    family('Thrushes', 'Turdidae', [
      sp('American robin', 'Turdus migratorius', ['NA']),
      sp('Eurasian blackbird', 'Turdus merula', ['EU', 'AS', 'OC']),
      sp('Song thrush', 'Turdus philomelos', ['EU']),
      sp('Eastern bluebird', 'Sialia sialis', ['NA']),
      sp('Wood thrush', 'Hylocichla mustelina', ['NA']),
    ]),
    family('Chats & Old World flycatchers', 'Muscicapidae', [
      sp('European robin', 'Erithacus rubecula', ['EU']),
      sp('Black redstart', 'Phoenicurus ochruros', ['EU', 'AS']),
    ]),
    family('Crows, jays & magpies', 'Corvidae', [
      sp('American crow', 'Corvus brachyrhynchos', ['NA']),
      sp('Carrion crow', 'Corvus corone', ['EU']),
      sp('Common raven', 'Corvus corax', ['NA', 'EU', 'AS']),
      sp('Blue jay', 'Cyanocitta cristata', ['NA']),
      sp("Steller's jay", 'Cyanocitta stelleri', ['NA']),
      sp('Eurasian jay', 'Garrulus glandarius', ['EU', 'AS']),
      sp('Eurasian magpie', 'Pica pica', ['EU', 'AS']),
    ]),
    family('Old World sparrows', 'Passeridae', [
      sp('House sparrow', 'Passer domesticus', 'ALL'),
      sp('Eurasian tree sparrow', 'Passer montanus', ['EU', 'AS']),
    ]),
    family('New World sparrows', 'Passerellidae', [
      sp('Song sparrow', 'Melospiza melodia', ['NA']),
      sp('Dark-eyed junco', 'Junco hyemalis', ['NA']),
      sp('White-throated sparrow', 'Zonotrichia albicollis', ['NA']),
      sp('Chipping sparrow', 'Spizella passerina', ['NA']),
    ]),
    family('Finches', 'Fringillidae', [
      sp('American goldfinch', 'Spinus tristis', ['NA']),
      sp('House finch', 'Haemorhous mexicanus', ['NA']),
      sp('Common chaffinch', 'Fringilla coelebs', ['EU']),
      sp('European goldfinch', 'Carduelis carduelis', ['EU', 'AS']),
      sp('Eurasian bullfinch', 'Pyrrhula pyrrhula', ['EU', 'AS']),
    ]),
    family('Tits & chickadees', 'Paridae', [
      sp('Black-capped chickadee', 'Poecile atricapillus', ['NA']),
      sp('Carolina chickadee', 'Poecile carolinensis', ['NA']),
      sp('Tufted titmouse', 'Baeolophus bicolor', ['NA']),
      sp('Great tit', 'Parus major', ['EU', 'AS']),
      sp('Eurasian blue tit', 'Cyanistes caeruleus', ['EU']),
    ]),
    family('Cardinals & grosbeaks', 'Cardinalidae', [
      sp('Northern cardinal', 'Cardinalis cardinalis', ['NA']),
      sp('Rose-breasted grosbeak', 'Pheucticus ludovicianus', ['NA']),
      sp('Indigo bunting', 'Passerina cyanea', ['NA']),
    ]),
    family('Starlings & mynas', 'Sturnidae', [
      sp('European starling', 'Sturnus vulgaris', ['NA', 'EU', 'AS', 'AF', 'OC']),
      sp('Common myna', 'Acridotheres tristis', ['AS', 'OC', 'AF']),
    ]),
    family('Swallows', 'Hirundinidae', [
      sp('Barn swallow', 'Hirundo rustica', 'ALL'),
      sp('Tree swallow', 'Tachycineta bicolor', ['NA']),
    ]),
    family('Mockingbirds & catbirds', 'Mimidae', [
      sp('Northern mockingbird', 'Mimus polyglottos', ['NA']),
      sp('Gray catbird', 'Dumetella carolinensis', ['NA']),
      sp('Brown thrasher', 'Toxostoma rufum', ['NA']),
    ]),
    family('Wrens', 'Troglodytidae', [
      sp('Carolina wren', 'Thryothorus ludovicianus', ['NA']),
      sp('House wren', 'Troglodytes aedon', ['NA', 'SA']),
      sp('Eurasian wren', 'Troglodytes troglodytes', ['EU', 'AS']),
    ]),
    family('New World blackbirds & orioles', 'Icteridae', [
      sp('Red-winged blackbird', 'Agelaius phoeniceus', ['NA']),
      sp('Common grackle', 'Quiscalus quiscula', ['NA']),
      sp('Brown-headed cowbird', 'Molothrus ater', ['NA']),
      sp('Baltimore oriole', 'Icterus galbula', ['NA']),
    ]),
    family('Nuthatches', 'Sittidae', [
      sp('White-breasted nuthatch', 'Sitta carolinensis', ['NA']),
      sp('Eurasian nuthatch', 'Sitta europaea', ['EU', 'AS']),
    ]),
    family('Tyrant flycatchers', 'Tyrannidae', [
      sp('Eastern phoebe', 'Sayornis phoebe', ['NA']),
      sp('Eastern kingbird', 'Tyrannus tyrannus', ['NA']),
    ]),
    family('Wood-warblers', 'Parulidae', [
      sp('Yellow warbler', 'Setophaga petechia', ['NA', 'SA']),
      sp('Yellow-rumped warbler', 'Setophaga coronata', ['NA']),
    ]),
    family('Waxwings', 'Bombycillidae', [sp('Cedar waxwing', 'Bombycilla cedrorum', ['NA'])]),
    family('Wagtails & pipits', 'Motacillidae', [sp('White wagtail', 'Motacilla alba', ['EU', 'AS', 'AF'])]),
    family('Butcherbirds & allies', 'Artamidae', [sp('Australian magpie', 'Gymnorhina tibicen', ['OC'])]),
  ]),
  group('birds-of-prey', 'Birds of prey', ['Accipitriformes', 'Falconiformes', 'Strigiformes', 'Cathartiformes'], [
    family('Hawks & eagles', 'Accipitridae', [
      sp('Red-tailed hawk', 'Buteo jamaicensis', ['NA']),
      sp('Red-shouldered hawk', 'Buteo lineatus', ['NA']),
      sp("Cooper's hawk", 'Accipiter cooperii', ['NA'], { syn: ['Astur cooperii'] }),
      sp('Bald eagle', 'Haliaeetus leucocephalus', ['NA']),
      sp('Golden eagle', 'Aquila chrysaetos', ['NA', 'EU', 'AS', 'AF']),
      sp('Common buzzard', 'Buteo buteo', ['EU', 'AS', 'AF']),
      sp('Red kite', 'Milvus milvus', ['EU']),
      sp('Black kite', 'Milvus migrans', ['EU', 'AS', 'AF', 'OC']),
      sp('Eurasian sparrowhawk', 'Accipiter nisus', ['EU', 'AS']),
      sp('Northern harrier', 'Circus hudsonius', ['NA']),
    ]),
    family('Falcons', 'Falconidae', [
      sp('Peregrine falcon', 'Falco peregrinus', 'ALL'),
      sp('American kestrel', 'Falco sparverius', ['NA', 'SA']),
      sp('Common kestrel', 'Falco tinnunculus', ['EU', 'AS', 'AF']),
      sp('Merlin', 'Falco columbarius', ['NA', 'EU', 'AS']),
    ]),
    family('Owls', 'Strigidae', [
      sp('Great horned owl', 'Bubo virginianus', ['NA', 'SA']),
      sp('Barred owl', 'Strix varia', ['NA']),
      sp('Eastern screech-owl', 'Megascops asio', ['NA']),
      sp('Tawny owl', 'Strix aluco', ['EU', 'AS']),
      sp('Little owl', 'Athene noctua', ['EU', 'AS', 'AF']),
      sp('Burrowing owl', 'Athene cunicularia', ['NA', 'SA']),
    ]),
    family('Barn owls', 'Tytonidae', [
      sp('Barn owl', 'Tyto alba', 'ALL', { syn: ['Tyto furcata', 'Tyto javanica'] }),
    ]),
    family('New World vultures', 'Cathartidae', [
      sp('Turkey vulture', 'Cathartes aura', ['NA', 'SA']),
      sp('Black vulture', 'Coragyps atratus', ['NA', 'SA']),
    ]),
    family('Ospreys', 'Pandionidae', [sp('Osprey', 'Pandion haliaetus', 'ALL')]),
  ]),
  family('Ducks, geese & swans', 'Anatidae', [
    sp('Mallard', 'Anas platyrhynchos', 'ALL'),
    sp('Canada goose', 'Branta canadensis', ['NA', 'EU']),
    sp('Mute swan', 'Cygnus olor', ['EU', 'AS', 'NA']),
    sp('Black swan', 'Cygnus atratus', ['OC']),
    sp('Wood duck', 'Aix sponsa', ['NA']),
    sp('Mandarin duck', 'Aix galericulata', ['AS', 'EU']),
    sp('Greylag goose', 'Anser anser', ['EU', 'AS'], { syn: ['Anser anser domesticus'] }),
    sp('Muscovy duck', 'Cairina moschata', ['NA', 'SA']),
    sp('Tufted duck', 'Aythya fuligula', ['EU', 'AS']),
    sp('Pacific black duck', 'Anas superciliosa', ['OC']),
  ], ['Anseriformes']),
  family('Herons & egrets', 'Ardeidae', [
    sp('Great blue heron', 'Ardea herodias', ['NA']),
    sp('Grey heron', 'Ardea cinerea', ['EU', 'AS', 'AF']),
    sp('Great egret', 'Ardea alba', 'ALL'),
    sp('Snowy egret', 'Egretta thula', ['NA', 'SA']),
    sp('Little egret', 'Egretta garzetta', ['EU', 'AS', 'AF', 'OC']),
    sp('Green heron', 'Butorides virescens', ['NA']),
    sp('Western cattle egret', 'Bubulcus ibis', 'ALL'),
  ]),
  group('gulls-shorebirds', 'Gulls & shorebirds', ['Charadriiformes'], [
    family('Gulls & terns', 'Laridae', [
      sp('Ring-billed gull', 'Larus delawarensis', ['NA']),
      sp('American herring gull', 'Larus smithsonianus', ['NA']),
      sp('European herring gull', 'Larus argentatus', ['EU']),
      sp('Laughing gull', 'Leucophaeus atricilla', ['NA']),
      sp('Black-headed gull', 'Chroicocephalus ridibundus', ['EU', 'AS']),
      sp('Silver gull', 'Chroicocephalus novaehollandiae', ['OC']),
      sp('Common tern', 'Sterna hirundo', ['NA', 'EU', 'AS']),
    ]),
    family('Plovers & lapwings', 'Charadriidae', [
      sp('Killdeer', 'Charadrius vociferus', ['NA']),
      sp('Northern lapwing', 'Vanellus vanellus', ['EU', 'AS']),
      sp('Masked lapwing', 'Vanellus miles', ['OC']),
    ]),
    family('Sandpipers', 'Scolopacidae', [
      sp('Spotted sandpiper', 'Actitis macularius', ['NA', 'SA']),
      sp('Sanderling', 'Calidris alba', 'ALL'),
    ]),
  ]),
  family('Pigeons & doves', 'Columbidae', [
    sp('Rock pigeon', 'Columba livia', 'ALL'),
    sp('Mourning dove', 'Zenaida macroura', ['NA']),
    sp('Eurasian collared-dove', 'Streptopelia decaocto', ['EU', 'AS', 'NA']),
    sp('Common wood pigeon', 'Columba palumbus', ['EU']),
    sp('Spotted dove', 'Spilopelia chinensis', ['AS', 'OC']),
    sp('Laughing dove', 'Spilopelia senegalensis', ['AF', 'AS']),
  ], ['Columbiformes']),
  family('Woodpeckers', 'Picidae', [
    sp('Downy woodpecker', 'Dryobates pubescens', ['NA'], { syn: ['Picoides pubescens'] }),
    sp('Hairy woodpecker', 'Dryobates villosus', ['NA'], { syn: ['Leuconotopicus villosus', 'Picoides villosus'] }),
    sp('Red-bellied woodpecker', 'Melanerpes carolinus', ['NA']),
    sp('Red-headed woodpecker', 'Melanerpes erythrocephalus', ['NA']),
    sp('Northern flicker', 'Colaptes auratus', ['NA']),
    sp('Pileated woodpecker', 'Dryocopus pileatus', ['NA']),
    sp('Great spotted woodpecker', 'Dendrocopos major', ['EU', 'AS']),
    sp('European green woodpecker', 'Picus viridis', ['EU']),
  ], ['Piciformes']),
  family('Hummingbirds', 'Trochilidae', [
    sp('Ruby-throated hummingbird', 'Archilochus colubris', ['NA']),
    sp("Anna's hummingbird", 'Calypte anna', ['NA']),
    sp('Rufous hummingbird', 'Selasphorus rufus', ['NA']),
  ]),
  group('game-birds', 'Chickens & game birds', ['Galliformes'], [
    family('Pheasants, chickens & turkeys', 'Phasianidae', [
      dom('Chicken', 'Gallus domesticus', ['Gallus gallus domesticus']),
      sp('Wild turkey', 'Meleagris gallopavo', ['NA']),
      sp('Common pheasant', 'Phasianus colchicus', ['EU', 'AS', 'NA']),
      sp('Indian peafowl', 'Pavo cristatus', ['AS']),
      sp('Ruffed grouse', 'Bonasa umbellus', ['NA']),
      sp('Grey partridge', 'Perdix perdix', ['EU']),
    ]),
    family('New World quail', 'Odontophoridae', [
      sp('Northern bobwhite', 'Colinus virginianus', ['NA']),
      sp('California quail', 'Callipepla californica', ['NA']),
    ]),
  ]),
  group('parrots', 'Parrots', ['Psittaciformes'], [
    pet('Budgerigar', 'Melopsittacus undulatus', ['OC']),
    pet('Cockatiel', 'Nymphicus hollandicus', ['OC']),
    sp('Rose-ringed parakeet', 'Psittacula krameri', ['AS', 'AF', 'EU']),
    sp('Monk parakeet', 'Myiopsitta monachus', ['SA', 'NA', 'EU']),
    sp('Sulphur-crested cockatoo', 'Cacatua galerita', ['OC']),
    sp('Rainbow lorikeet', 'Trichoglossus moluccanus', ['OC']),
    sp('Galah', 'Eolophus roseicapilla', ['OC']),
  ]),
  family('Kingfishers', 'Alcedinidae', [
    sp('Belted kingfisher', 'Megaceryle alcyon', ['NA']),
    sp('Common kingfisher', 'Alcedo atthis', ['EU', 'AS', 'AF']),
    sp('Laughing kookaburra', 'Dacelo novaeguineae', ['OC']),
  ], ['Coraciiformes']),
  group('cranes-rails', 'Cranes & rails', ['Gruiformes', 'Gruidae', 'Rallidae'], [
    sp('Sandhill crane', 'Antigone canadensis', ['NA'], { syn: ['Grus canadensis'] }),
    sp('Common crane', 'Grus grus', ['EU', 'AS']),
    sp('American coot', 'Fulica americana', ['NA']),
    sp('Eurasian coot', 'Fulica atra', ['EU', 'AS', 'OC']),
    sp('Common moorhen', 'Gallinula chloropus', ['EU', 'AS', 'AF']),
  ]),
  group('cormorants-pelicans', 'Cormorants & pelicans', ['Suliformes', 'Phalacrocoracidae', 'Pelecanidae'], [
    sp('Double-crested cormorant', 'Nannopterum auritum', ['NA'], { syn: ['Phalacrocorax auritus'] }),
    sp('Great cormorant', 'Phalacrocorax carbo', ['NA', 'EU', 'AS', 'AF', 'OC']),
    sp('Brown pelican', 'Pelecanus occidentalis', ['NA', 'SA']),
    sp('Australian pelican', 'Pelecanus conspicillatus', ['OC']),
  ]),
  group('ratites', 'Ostriches & emus', ['Struthioniformes', 'Casuariiformes'], [
    sp('Common ostrich', 'Struthio camelus', ['AF']),
    sp('Emu', 'Dromaius novaehollandiae', ['OC']),
  ]),
]);

// ---------------------------------------------------------------------------
// Reptiles
// ---------------------------------------------------------------------------

const reptiles = group('reptiles', 'Reptiles', ['Reptilia', 'Squamata'], [
  group('turtles', 'Turtles & tortoises', ['Testudines', 'Testudinata'], [
    sp('Painted turtle', 'Chrysemys picta', ['NA']),
    sp('Common snapping turtle', 'Chelydra serpentina', ['NA']),
    pet('Red-eared slider', 'Trachemys scripta', ['NA', 'EU', 'AS', 'OC'], ['Trachemys scripta elegans']),
    sp('Eastern box turtle', 'Terrapene carolina', ['NA']),
    sp('Gopher tortoise', 'Gopherus polyphemus', ['NA']),
    sp('European pond turtle', 'Emys orbicularis', ['EU', 'AS']),
    sp("Hermann's tortoise", 'Testudo hermanni', ['EU']),
  ]),
  group('lizards', 'Lizards', [
    'Lacertilia', 'Sauria', 'Iguanidae', 'Dactyloidae', 'Phrynosomatidae', 'Lacertidae', 'Gekkonidae',
    'Scincidae', 'Agamidae', 'Varanidae', 'Anguidae', 'Eublepharidae', 'Chamaeleonidae', 'Teiidae',
  ], [
    sp('Green anole', 'Anolis carolinensis', ['NA']),
    sp('Brown anole', 'Anolis sagrei', ['NA']),
    sp('Eastern fence lizard', 'Sceloporus undulatus', ['NA']),
    sp('Western fence lizard', 'Sceloporus occidentalis', ['NA']),
    sp('Common five-lined skink', 'Plestiodon fasciatus', ['NA']),
    sp('Common wall lizard', 'Podarcis muralis', ['EU']),
    sp('Sand lizard', 'Lacerta agilis', ['EU', 'AS']),
    sp('Slow worm', 'Anguis fragilis', ['EU']),
    sp('Mediterranean house gecko', 'Hemidactylus turcicus', ['EU', 'AF', 'AS', 'NA']),
    sp('Common house gecko', 'Hemidactylus frenatus', ['AS', 'OC', 'AF']),
    pet('Leopard gecko', 'Eublepharis macularius', ['AS']),
    pet('Central bearded dragon', 'Pogona vitticeps', ['OC']),
    pet('Green iguana', 'Iguana iguana', ['SA', 'NA']),
  ]),
  group('snakes', 'Snakes', [
    'Serpentes', 'Colubridae', 'Natricidae', 'Viperidae', 'Pythonidae', 'Boidae', 'Elapidae', 'Lamprophiidae',
  ], [
    sp('Common garter snake', 'Thamnophis sirtalis', ['NA']),
    sp('Eastern rat snake', 'Pantherophis alleghaniensis', ['NA'], { syn: ['Pantherophis obsoletus', 'Elaphe obsoleta'] }),
    sp('Northern water snake', 'Nerodia sipedon', ['NA']),
    sp("DeKay's brownsnake", 'Storeria dekayi', ['NA']),
    pet('Corn snake', 'Pantherophis guttatus', ['NA'], ['Elaphe guttata']),
    sp('Timber rattlesnake', 'Crotalus horridus', ['NA']),
    sp('Eastern copperhead', 'Agkistrodon contortrix', ['NA']),
    sp('Grass snake', 'Natrix natrix', ['EU', 'AS'], { syn: ['Natrix helvetica'] }),
    sp('Common European adder', 'Vipera berus', ['EU', 'AS']),
    pet('Ball python', 'Python regius', ['AF']),
    sp('Eastern brown snake', 'Pseudonaja textilis', ['OC']),
    sp('Red-bellied black snake', 'Pseudechis porphyriacus', ['OC']),
  ]),
  group('crocodilians', 'Crocodiles & alligators', ['Crocodylia', 'Crocodilia'], [
    sp('American alligator', 'Alligator mississippiensis', ['NA']),
    sp('American crocodile', 'Crocodylus acutus', ['NA', 'SA']),
    sp('Nile crocodile', 'Crocodylus niloticus', ['AF']),
    sp('Saltwater crocodile', 'Crocodylus porosus', ['OC', 'AS']),
  ]),
]);

// ---------------------------------------------------------------------------
// Amphibians
// ---------------------------------------------------------------------------

const amphibians = group('amphibians', 'Amphibians', ['Amphibia'], [
  group('frogs-toads', 'Frogs & toads', ['Anura'], [
    sp('American bullfrog', 'Lithobates catesbeianus', ['NA'], { syn: ['Rana catesbeiana', 'Aquarana catesbeiana'] }),
    sp('Green frog', 'Lithobates clamitans', ['NA'], { syn: ['Rana clamitans'] }),
    sp('Northern leopard frog', 'Lithobates pipiens', ['NA'], { syn: ['Rana pipiens'] }),
    sp('Wood frog', 'Lithobates sylvaticus', ['NA'], { syn: ['Rana sylvatica'] }),
    sp('Spring peeper', 'Pseudacris crucifer', ['NA']),
    sp('Gray treefrog', 'Dryophytes versicolor', ['NA'], { syn: ['Hyla versicolor'] }),
    sp('Green treefrog', 'Dryophytes cinereus', ['NA'], { syn: ['Hyla cinerea'] }),
    sp('American toad', 'Anaxyrus americanus', ['NA'], { syn: ['Bufo americanus'] }),
    sp('Common frog', 'Rana temporaria', ['EU', 'AS']),
    sp('Marsh frog', 'Pelophylax ridibundus', ['EU', 'AS']),
    sp('European tree frog', 'Hyla arborea', ['EU']),
    sp('Common toad', 'Bufo bufo', ['EU', 'AS']),
    sp('Cane toad', 'Rhinella marina', ['SA', 'NA', 'OC'], { syn: ['Bufo marinus'] }),
    pet('Australian green tree frog', 'Ranoidea caerulea', ['OC'], ['Litoria caerulea']),
  ]),
  group('salamanders', 'Salamanders & newts', ['Caudata', 'Urodela'], [
    sp('Eastern red-backed salamander', 'Plethodon cinereus', ['NA']),
    sp('Eastern newt', 'Notophthalmus viridescens', ['NA']),
    sp('Spotted salamander', 'Ambystoma maculatum', ['NA']),
    sp('Northern two-lined salamander', 'Eurycea bislineata', ['NA']),
    sp('Fire salamander', 'Salamandra salamandra', ['EU']),
    sp('Smooth newt', 'Lissotriton vulgaris', ['EU', 'AS']),
    pet('Axolotl', 'Ambystoma mexicanum', ['NA']),
  ]),
]);

// ---------------------------------------------------------------------------
// Fish
// ---------------------------------------------------------------------------

const fish = group('fish', 'Fish', ['Actinopterygii', 'Teleostei', 'Osteichthyes', 'Pisces'], [
  group('sunfish-bass', 'Sunfish & bass', ['Centrarchidae'], [
    sp('Bluegill', 'Lepomis macrochirus', ['NA']),
    sp('Pumpkinseed', 'Lepomis gibbosus', ['NA', 'EU']),
    sp('Largemouth bass', 'Micropterus salmoides', ['NA']),
    sp('Smallmouth bass', 'Micropterus dolomieu', ['NA']),
    sp('Black crappie', 'Pomoxis nigromaculatus', ['NA']),
  ]),
  group('trout-salmon', 'Trout & salmon', ['Salmonidae', 'Salmoniformes'], [
    sp('Rainbow trout', 'Oncorhynchus mykiss', 'ALL'),
    sp('Brown trout', 'Salmo trutta', 'ALL'),
    sp('Brook trout', 'Salvelinus fontinalis', ['NA']),
    sp('Atlantic salmon', 'Salmo salar', ['NA', 'EU']),
    sp('Chinook salmon', 'Oncorhynchus tshawytscha', ['NA']),
    sp('Sockeye salmon', 'Oncorhynchus nerka', ['NA', 'AS']),
  ]),
  group('carp-minnows', 'Carp, goldfish & minnows', ['Cypriniformes', 'Cyprinidae', 'Leuciscidae'], [
    sp('Common carp', 'Cyprinus carpio', 'ALL', { syn: ['Cyprinus rubrofuscus'] }),
    dom('Goldfish', 'Carassius auratus'),
    sp('Grass carp', 'Ctenopharyngodon idella', ['AS', 'NA', 'EU']),
    sp('Fathead minnow', 'Pimephales promelas', ['NA']),
    sp('Common roach', 'Rutilus rutilus', ['EU', 'AS']),
  ]),
  group('catfish', 'Catfish', ['Siluriformes'], [
    sp('Channel catfish', 'Ictalurus punctatus', ['NA']),
    sp('Brown bullhead', 'Ameiurus nebulosus', ['NA']),
    sp('Wels catfish', 'Silurus glanis', ['EU', 'AS']),
  ]),
  group('pike-perch', 'Pike & perch', ['Esociformes', 'Esocidae', 'Percidae'], [
    sp('Northern pike', 'Esox lucius', ['NA', 'EU', 'AS']),
    sp('Yellow perch', 'Perca flavescens', ['NA']),
    sp('European perch', 'Perca fluviatilis', ['EU', 'AS']),
    sp('Walleye', 'Sander vitreus', ['NA']),
    sp('Zander', 'Sander lucioperca', ['EU', 'AS']),
  ]),
  group('aquarium-fish', 'Aquarium favorites', ['Poeciliidae', 'Osphronemidae', 'Cichlidae', 'Danionidae'], [
    dom('Guppy', 'Poecilia reticulata'),
    dom('Siamese fighting fish', 'Betta splendens'),
    dom('Zebrafish', 'Danio rerio'),
    dom('Freshwater angelfish', 'Pterophyllum scalare'),
    sp('Nile tilapia', 'Oreochromis niloticus', ['AF', 'AS', 'NA', 'SA']),
  ]),
  group('sea-fish', 'Coastal & reef fish', [
    'Moronidae', 'Gadidae', 'Pomacentridae', 'Acanthuridae', 'Scombridae', 'Labridae',
  ], [
    sp('Striped bass', 'Morone saxatilis', ['NA']),
    sp('Atlantic cod', 'Gadus morhua', ['NA', 'EU']),
    sp('Atlantic mackerel', 'Scomber scombrus', ['NA', 'EU']),
    sp('Garibaldi', 'Hypsypops rubicundus', ['NA']),
    sp('Clown anemonefish', 'Amphiprion ocellaris', ['AS', 'OC'], { pet: true }),
    sp('Yellow tang', 'Zebrasoma flavescens', ['OC'], { pet: true }),
  ]),
  group('sharks-rays', 'Sharks & rays', ['Chondrichthyes', 'Elasmobranchii', 'Selachimorpha', 'Batoidea'], [
    sp('Bonnethead', 'Sphyrna tiburo', ['NA', 'SA']),
    sp('Lemon shark', 'Negaprion brevirostris', ['NA', 'SA', 'AF']),
    sp('Blacktip reef shark', 'Carcharhinus melanopterus', ['AS', 'OC', 'AF']),
    sp('Southern stingray', 'Hypanus americanus', ['NA', 'SA'], { syn: ['Dasyatis americana'] }),
  ]),
]);

// ---------------------------------------------------------------------------
// Insects (common, everyday species only)
// ---------------------------------------------------------------------------

const insects = group('insects', 'Insects', ['Insecta', 'Hexapoda'], [
  group('butterflies-moths', 'Butterflies & moths', ['Lepidoptera'], [
    family('Brush-footed butterflies', 'Nymphalidae', [
      sp('Monarch', 'Danaus plexippus', ['NA', 'SA', 'OC']),
      sp('Red admiral', 'Vanessa atalanta', ['NA', 'EU', 'AS', 'AF']),
      sp('Painted lady', 'Vanessa cardui', 'ALL'),
      sp('Mourning cloak', 'Nymphalis antiopa', ['NA', 'EU', 'AS']),
      sp('Peacock butterfly', 'Aglais io', ['EU', 'AS']),
      sp('Small tortoiseshell', 'Aglais urticae', ['EU', 'AS']),
      sp('Common buckeye', 'Junonia coenia', ['NA']),
      sp('Meadow brown', 'Maniola jurtina', ['EU']),
    ]),
    family('Swallowtails', 'Papilionidae', [
      sp('Eastern tiger swallowtail', 'Papilio glaucus', ['NA']),
      sp('Black swallowtail', 'Papilio polyxenes', ['NA']),
      sp('Old World swallowtail', 'Papilio machaon', ['EU', 'AS']),
    ]),
    family('Whites & sulphurs', 'Pieridae', [
      sp('Cabbage white', 'Pieris rapae', ['NA', 'EU', 'AS', 'AF', 'OC']),
      sp('Large white', 'Pieris brassicae', ['EU', 'AS', 'AF']),
      sp('Clouded sulphur', 'Colias philodice', ['NA']),
      sp('Common brimstone', 'Gonepteryx rhamni', ['EU', 'AS']),
    ]),
    group('moths', 'Moths', ['Saturniidae', 'Sphingidae', 'Erebidae', 'Noctuidae', 'Geometridae'], [
      sp('Luna moth', 'Actias luna', ['NA']),
      sp('Rosy maple moth', 'Dryocampa rubicunda', ['NA']),
      sp('Isabella tiger moth', 'Pyrrharctia isabella', ['NA']),
      sp('Spongy moth', 'Lymantria dispar', ['NA', 'EU', 'AS']),
      sp('Hummingbird hawk-moth', 'Macroglossum stellatarum', ['EU', 'AS', 'AF']),
    ]),
  ]),
  group('bees-wasps-ants', 'Bees, wasps & ants', ['Hymenoptera'], [
    family('Bees', 'Apidae', [
      sp('Western honey bee', 'Apis mellifera', 'ALL'),
      sp('Common eastern bumble bee', 'Bombus impatiens', ['NA']),
      sp('Buff-tailed bumblebee', 'Bombus terrestris', ['EU', 'AS', 'OC']),
      sp('Red-tailed bumblebee', 'Bombus lapidarius', ['EU']),
      sp('Eastern carpenter bee', 'Xylocopa virginica', ['NA']),
    ]),
    family('Wasps & hornets', 'Vespidae', [
      sp('European paper wasp', 'Polistes dominula', ['EU', 'NA']),
      sp('Common wasp', 'Vespula vulgaris', ['EU', 'AS', 'OC']),
      sp('Eastern yellowjacket', 'Vespula maculifrons', ['NA']),
      sp('European hornet', 'Vespa crabro', ['EU', 'AS', 'NA']),
      sp('Bald-faced hornet', 'Dolichovespula maculata', ['NA']),
    ]),
    family('Ants', 'Formicidae', [
      sp('Red imported fire ant', 'Solenopsis invicta', ['NA', 'SA', 'AS', 'OC']),
      sp('Eastern black carpenter ant', 'Camponotus pennsylvanicus', ['NA']),
      sp('Black garden ant', 'Lasius niger', ['EU', 'AS']),
      sp('Red wood ant', 'Formica rufa', ['EU']),
    ]),
  ]),
  group('beetles', 'Beetles', ['Coleoptera'], [
    family('Lady beetles', 'Coccinellidae', [
      sp('Seven-spot ladybird', 'Coccinella septempunctata', ['EU', 'AS', 'NA', 'AF']),
      sp('Asian lady beetle', 'Harmonia axyridis', ['NA', 'SA', 'EU', 'AS', 'AF']),
      sp('Two-spot ladybird', 'Adalia bipunctata', ['EU', 'NA']),
    ]),
    family('Scarab beetles', 'Scarabaeidae', [
      sp('Japanese beetle', 'Popillia japonica', ['NA', 'AS']),
      sp('Green June beetle', 'Cotinis nitida', ['NA']),
      sp('Common cockchafer', 'Melolontha melolontha', ['EU']),
    ]),
    family('Stag beetles', 'Lucanidae', [
      sp('European stag beetle', 'Lucanus cervus', ['EU']),
      sp('Reddish-brown stag beetle', 'Lucanus capreolus', ['NA']),
    ]),
    family('Fireflies', 'Lampyridae', [sp('Common eastern firefly', 'Photinus pyralis', ['NA'])]),
    family('Leaf beetles', 'Chrysomelidae', [
      sp('Colorado potato beetle', 'Leptinotarsa decemlineata', ['NA', 'EU', 'AS']),
    ]),
  ]),
  group('dragonflies', 'Dragonflies & damselflies', ['Odonata', 'Anisoptera', 'Zygoptera'], [
    sp('Common green darner', 'Anax junius', ['NA']),
    sp('Emperor dragonfly', 'Anax imperator', ['EU', 'AF', 'AS']),
    sp('Eastern pondhawk', 'Erythemis simplicicollis', ['NA']),
    sp('Widow skimmer', 'Libellula luctuosa', ['NA']),
    sp('Twelve-spotted skimmer', 'Libellula pulchella', ['NA']),
    sp('Common darter', 'Sympetrum striolatum', ['EU', 'AS']),
    sp('Ebony jewelwing', 'Calopteryx maculata', ['NA']),
    sp('Banded demoiselle', 'Calopteryx splendens', ['EU', 'AS']),
    sp('Blue-tailed damselfly', 'Ischnura elegans', ['EU', 'AS']),
  ]),
  group('grasshoppers-crickets', 'Grasshoppers & crickets', ['Orthoptera'], [
    sp('Differential grasshopper', 'Melanoplus differentialis', ['NA']),
    sp('Carolina grasshopper', 'Dissosteira carolina', ['NA']),
    sp('Meadow grasshopper', 'Pseudochorthippus parallelus', ['EU'], { syn: ['Chorthippus parallelus'] }),
    sp('House cricket', 'Acheta domesticus', 'ALL'),
    sp('Fall field cricket', 'Gryllus pennsylvanicus', ['NA']),
    sp('Common true katydid', 'Pterophylla camellifolia', ['NA']),
    sp('Great green bush-cricket', 'Tettigonia viridissima', ['EU', 'AS']),
  ]),
  group('true-bugs', 'True bugs & cicadas', ['Hemiptera'], [
    sp('Brown marmorated stink bug', 'Halyomorpha halys', ['NA', 'EU', 'AS']),
    sp('Spotted lanternfly', 'Lycorma delicatula', ['NA', 'AS']),
    sp('Periodical cicada', 'Magicicada septendecim', ['NA']),
    sp('Dog-day cicada', 'Neotibicen canicularis', ['NA']),
    sp('Large milkweed bug', 'Oncopeltus fasciatus', ['NA']),
    sp('Common water strider', 'Aquarius remigis', ['NA']),
    sp('Firebug', 'Pyrrhocoris apterus', ['EU', 'AS']),
    sp('Green shield bug', 'Palomena prasina', ['EU']),
  ]),
  group('flies', 'Flies & mosquitoes', ['Diptera'], [
    sp('House fly', 'Musca domestica', 'ALL'),
    sp('Common green bottle fly', 'Lucilia sericata', 'ALL'),
    sp('Drone fly', 'Eristalis tenax', 'ALL'),
    sp('Marmalade hoverfly', 'Episyrphus balteatus', ['EU', 'AS']),
    sp('Common house mosquito', 'Culex pipiens', 'ALL'),
  ]),
  group('mantises', 'Mantises', ['Mantodea'], [
    sp('European mantis', 'Mantis religiosa', ['EU', 'AS', 'AF', 'NA']),
    sp('Chinese mantis', 'Tenodera sinensis', ['AS', 'NA']),
    sp('Carolina mantis', 'Stagmomantis carolina', ['NA']),
  ]),
  group('cockroaches-termites', 'Cockroaches & termites', ['Blattodea'], [
    sp('American cockroach', 'Periplaneta americana', 'ALL'),
    sp('German cockroach', 'Blattella germanica', 'ALL'),
    sp('Eastern subterranean termite', 'Reticulitermes flavipes', ['NA']),
  ]),
]);

// ---------------------------------------------------------------------------
// Spiders & kin
// ---------------------------------------------------------------------------

const arachnids = group('arachnids', 'Spiders & kin', ['Arachnida'], [
  group('spiders', 'Spiders', ['Araneae'], [
    sp('Yellow garden spider', 'Argiope aurantia', ['NA']),
    sp('Wasp spider', 'Argiope bruennichi', ['EU', 'AS']),
    sp('European garden spider', 'Araneus diadematus', ['EU', 'AS', 'NA']),
    sp('Common house spider', 'Parasteatoda tepidariorum', 'ALL'),
    sp('Bold jumping spider', 'Phidippus audax', ['NA']),
    sp('Zebra jumping spider', 'Salticus scenicus', ['EU', 'NA', 'AS']),
    sp('Southern black widow', 'Latrodectus mactans', ['NA']),
    sp('Redback spider', 'Latrodectus hasselti', ['OC']),
    sp('Carolina wolf spider', 'Hogna carolinensis', ['NA']),
    sp('Giant house spider', 'Eratigena atrica', ['EU', 'NA'], { syn: ['Tegenaria atrica', 'Eratigena duellica'] }),
    sp('Long-bodied cellar spider', 'Pholcus phalangioides', 'ALL'),
    sp('Joro spider', 'Trichonephila clavata', ['AS', 'NA']),
  ]),
  group('ticks-mites', 'Ticks & mites', ['Acari', 'Ixodida', 'Ixodidae'], [
    sp('Blacklegged tick', 'Ixodes scapularis', ['NA']),
    sp('Castor bean tick', 'Ixodes ricinus', ['EU']),
    sp('American dog tick', 'Dermacentor variabilis', ['NA']),
    sp('Lone star tick', 'Amblyomma americanum', ['NA']),
  ]),
  group('harvestmen', 'Harvestmen', ['Opiliones'], [
    sp('European harvestman', 'Phalangium opilio', ['EU', 'AS', 'NA']),
    sp('Eastern harvestman', 'Leiobunum vittatum', ['NA']),
  ]),
  group('scorpions', 'Scorpions', ['Scorpiones'], [
    sp('Arizona bark scorpion', 'Centruroides sculpturatus', ['NA']),
    sp('Striped bark scorpion', 'Centruroides vittatus', ['NA']),
  ]),
]);

// ---------------------------------------------------------------------------
// Other invertebrates
// ---------------------------------------------------------------------------

const invertebrates = group('invertebrates', 'Other invertebrates', ['Mollusca', 'Annelida', 'Cnidaria', 'Echinodermata'], [
  group('snails-slugs', 'Snails & slugs', ['Gastropoda', 'Stylommatophora'], [
    sp('Garden snail', 'Cornu aspersum', 'ALL', { syn: ['Helix aspersa', 'Cantareus aspersus'] }),
    sp('Roman snail', 'Helix pomatia', ['EU']),
    sp('Grove snail', 'Cepaea nemoralis', ['EU', 'NA']),
    sp('Leopard slug', 'Limax maximus', ['EU', 'NA', 'OC']),
    sp('Pacific banana slug', 'Ariolimax columbianus', ['NA']),
    sp('Giant African land snail', 'Lissachatina fulica', ['AF', 'AS', 'OC', 'SA'], { syn: ['Achatina fulica'] }),
  ]),
  group('crustaceans', 'Crabs, crayfish & kin', ['Crustacea', 'Malacostraca', 'Decapoda', 'Isopoda'], [
    sp('Atlantic blue crab', 'Callinectes sapidus', ['NA', 'SA', 'EU']),
    sp('European green crab', 'Carcinus maenas', ['EU', 'NA', 'OC']),
    sp('Atlantic marsh fiddler crab', 'Minuca pugnax', ['NA'], { syn: ['Uca pugnax'] }),
    sp('American lobster', 'Homarus americanus', ['NA']),
    sp('Red swamp crayfish', 'Procambarus clarkii', ['NA', 'EU', 'AS', 'AF']),
    sp('Common pill bug', 'Armadillidium vulgare', 'ALL'),
    sp('Common shiny woodlouse', 'Oniscus asellus', ['EU', 'NA']),
  ]),
  group('worms', 'Worms & leeches', ['Clitellata', 'Oligochaeta', 'Hirudinea'], [
    sp('Common earthworm', 'Lumbricus terrestris', 'ALL'),
    sp('Red wiggler', 'Eisenia fetida', 'ALL'),
    sp('European medicinal leech', 'Hirudo medicinalis', ['EU']),
  ]),
  group('centipedes-millipedes', 'Centipedes & millipedes', ['Myriapoda', 'Chilopoda', 'Diplopoda'], [
    sp('House centipede', 'Scutigera coleoptrata', 'ALL'),
    sp('American giant millipede', 'Narceus americanus', ['NA']),
    sp('Greenhouse millipede', 'Oxidus gracilis', 'ALL'),
  ]),
  group('jellyfish-anemones', 'Jellyfish & anemones', ['Scyphozoa', 'Anthozoa', 'Hydrozoa'], [
    sp('Moon jellyfish', 'Aurelia aurita', 'ALL'),
    sp('Atlantic sea nettle', 'Chrysaora quinquecirrha', ['NA']),
    sp("Portuguese man o' war", 'Physalia physalis', 'ALL'),
    sp('Beadlet anemone', 'Actinia equina', ['EU', 'AF']),
  ]),
  group('sea-stars-urchins', 'Sea stars & urchins', ['Asteroidea', 'Echinoidea'], [
    sp('Ochre sea star', 'Pisaster ochraceus', ['NA']),
    sp('Common starfish', 'Asterias rubens', ['EU', 'NA']),
    sp('Purple sea urchin', 'Strongylocentrotus purpuratus', ['NA']),
  ]),
  group('octopus-clams', 'Octopuses, squid & clams', ['Cephalopoda', 'Bivalvia'], [
    sp('Common octopus', 'Octopus vulgaris', ['EU', 'AF', 'NA', 'SA']),
    sp('Blue mussel', 'Mytilus edulis', ['NA', 'EU']),
    sp('Eastern oyster', 'Crassostrea virginica', ['NA']),
  ]),
]);

export const SEED_TREE: SeedNode = {
  id: 'animals',
  common: 'Animals',
  sci: 'Animalia',
  rank: 'root',
  match: ['Metazoa'],
  children: [mammals, birds, reptiles, amphibians, fish, insects, arachnids, invertebrates],
};
