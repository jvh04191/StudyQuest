import type { Card, CardState, Deck, Player, Subject } from '@/store/types';
import { freshState } from '@/lib/srs';
import { DAY, yesterdayKey } from '@/lib/util';
import { newPlayer } from '@/lib/progression';

type Row = [front: string, back: string, detail: string, hint: string, distractors: string[], aliases?: string[]];

interface DeckSeed {
  id: string;
  subjectId: string;
  title: string;
  summary: string;
  x: number;
  y: number;
  links: string[];
  rows: Row[];
  /** Progress profile applied to the seeded learner. */
  profile: 'mastered' | 'review' | 'progress' | 'new';
}

export const SEED_SUBJECTS: Omit<Subject, 'createdAt'>[] = [
  { id: 'bio', name: 'Biology', color: '#5BC79A', art: 'biology', cx: 270, cy: 330 },
  { id: 'astro', name: 'Astronomy', color: '#8C9CFF', art: 'astronomy', cx: 735, cy: 320 },
];

const DECKS: DeckSeed[] = [
  {
    id: 'bio-cell', subjectId: 'bio', title: 'Cell Structure', x: 200, y: 440, links: [], profile: 'mastered',
    summary: 'Cells are the basic unit of life. Eukaryotic cells keep DNA in a nucleus and divide work among membrane-bound organelles; prokaryotes have no nucleus.',
    rows: [
      ['Which organelle produces most of a eukaryotic cell’s ATP?', 'Mitochondrion', 'Mitochondria run aerobic respiration. The electron transport chain on their folded inner membrane (the cristae) makes most of the cell’s ATP.', 'Look for the organelle with a folded inner membrane called cristae.', ['Ribosome', 'Golgi apparatus', 'Nucleus'], ['mitochondria', 'mitochondrion']],
      ['Where in the cell are proteins assembled?', 'Ribosomes', 'Ribosomes read mRNA and link amino acids into a polypeptide. They float free in the cytoplasm or stud the rough ER.', 'Some of them stud the rough ER.', ['Lysosomes', 'Smooth ER', 'Vacuole'], ['ribosome']],
      ['What does the Golgi apparatus do?', 'Modifies, sorts and packages proteins', 'Proteins from the rough ER arrive at the Golgi, get chemical tags such as sugars, and leave in vesicles bound for the membrane, lysosomes or export.', 'Think of a post office for proteins.', ['Breaks down worn-out organelles', 'Stores the cell’s DNA', 'Captures light energy']],
      ['Which structure gives plant cells a rigid shape that animal cells lack?', 'Cell wall', 'Plant cell walls are made mostly of cellulose. They resist the pressure of water inside the cell, which keeps the plant upright.', 'It is made of cellulose.', ['Cell membrane', 'Cytoskeleton', 'Centriole'], ['cellulose cell wall']],
      ['What key feature separates prokaryotic cells from eukaryotic cells?', 'No membrane-bound nucleus', 'Bacteria and archaea keep their DNA in a nucleoid region with no surrounding membrane. Eukaryotes enclose DNA inside a nucleus.', 'Ask where the DNA is kept.', ['No ribosomes', 'No cell membrane', 'No DNA']],
      ['Which organelle holds digestive enzymes that break down waste?', 'Lysosome', 'Lysosomes are acidic sacs of hydrolytic enzymes. They digest worn-out organelles and material the cell has taken in.', 'Its name means “dissolving body”.', ['Centrosome', 'Ribosome', 'Chloroplast'], ['lysosomes']],
    ],
  },
  {
    id: 'bio-membrane', subjectId: 'bio', title: 'Membrane Transport', x: 110, y: 300, links: ['bio-cell'], profile: 'review',
    summary: 'The cell membrane is a phospholipid bilayer that controls what enters and leaves. Passive transport follows concentration gradients; active transport spends ATP to go against them.',
    rows: [
      ['What is the basic structure of the cell membrane?', 'Phospholipid bilayer', 'Two layers of phospholipids with water-fearing tails facing inward and water-loving heads facing out, with proteins embedded throughout. This is the fluid mosaic model.', 'Two layers of a lipid with a head and two tails.', ['Cellulose sheet', 'Single protein layer', 'Starch matrix'], ['lipid bilayer', 'bilayer']],
      ['What is the movement of water across a semipermeable membrane called?', 'Osmosis', 'Water moves toward the side with more dissolved solute, from a dilute solution to a concentrated one.', 'This term is used only for water.', ['Active transport', 'Endocytosis', 'Exocytosis']],
      ['Which kind of transport uses ATP to move substances against their gradient?', 'Active transport', 'Pumps such as the sodium-potassium pump spend ATP to push ions from low to high concentration.', 'Going uphill costs energy.', ['Simple diffusion', 'Osmosis', 'Facilitated diffusion']],
      ['What happens to a red blood cell placed in a hypotonic solution?', 'It swells and may burst', 'The cell holds more solute than the water outside, so water rushes in. Animal cells have no wall to resist, so they can lyse.', 'Hypotonic means less solute outside the cell.', ['It shrinks', 'It stays the same', 'It divides']],
      ['What does a channel protein do in facilitated diffusion?', 'Lets specific molecules pass down their gradient', 'Channel proteins form pores for particular ions or molecules. No ATP is used because movement follows the concentration gradient.', 'Facilitated diffusion is still passive.', ['Pumps ions using ATP', 'Engulfs large particles', 'Builds new phospholipids']],
      ['How many sodium ions does the sodium-potassium pump move out per ATP?', '3', 'Each cycle pumps 3 Na⁺ out and 2 K⁺ in, which helps build the membrane’s resting voltage.', 'One more than the number of potassium ions it brings in.', ['1', '2', '4'], ['three']],
    ],
  },
  {
    id: 'bio-resp', subjectId: 'bio', title: 'Cellular Respiration', x: 330, y: 470, links: ['bio-cell'], profile: 'review',
    summary: 'Cells release energy from glucose in three stages: glycolysis in the cytoplasm, the Krebs cycle in the mitochondrial matrix, and the electron transport chain on the inner membrane.',
    rows: [
      ['What are the reactants of aerobic respiration?', 'Glucose and oxygen', 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP. Glucose is broken down and oxygen accepts the electrons at the end.', 'One is a sugar, one is a gas you breathe in.', ['Carbon dioxide and water', 'Glucose and carbon dioxide', 'Oxygen and water']],
      ['Where does glycolysis take place?', 'Cytoplasm', 'Glycolysis splits glucose into two pyruvate molecules in the cytoplasm for a net gain of 2 ATP. It does not need oxygen.', 'It happens before anything enters an organelle.', ['Mitochondrial matrix', 'Inner mitochondrial membrane', 'Nucleus'], ['cytosol']],
      ['Where does the Krebs cycle take place?', 'Mitochondrial matrix', 'Acetyl-CoA enters the Krebs cycle in the matrix, releasing CO₂ and loading NADH and FADH₂ with electrons.', 'The innermost space of the mitochondrion.', ['Cytoplasm', 'Outer mitochondrial membrane', 'Ribosome'], ['matrix', 'the matrix']],
      ['Which stage of respiration makes the most ATP?', 'Electron transport chain', 'About 26 to 28 of the roughly 30 to 32 ATP per glucose come from oxidative phosphorylation driven by the electron transport chain and ATP synthase.', 'It runs along the inner mitochondrial membrane.', ['Glycolysis', 'Krebs cycle', 'Fermentation'], ['ETC', 'oxidative phosphorylation']],
      ['What is the final electron acceptor in the electron transport chain?', 'Oxygen', 'Oxygen takes the electrons and combines with H⁺ to form water. Without it the chain backs up and aerobic respiration stops.', 'Without it you would switch to fermentation.', ['NAD⁺', 'Carbon dioxide', 'Glucose'], ['O2', 'o₂']],
      ['In muscle short on oxygen, what does pyruvate become?', 'Lactate', 'Lactic acid fermentation turns pyruvate into lactate, regenerating NAD⁺ so glycolysis can keep making a little ATP.', 'Linked to the burn of a hard sprint.', ['Ethanol', 'Acetyl-CoA', 'Glucose'], ['lactic acid']],
    ],
  },
  {
    id: 'bio-photo', subjectId: 'bio', title: 'Photosynthesis', x: 400, y: 360, links: ['bio-resp'], profile: 'new',
    summary: 'Plants capture light in chloroplasts. Light reactions in the thylakoids split water and make ATP and NADPH; the Calvin cycle in the stroma uses them to fix CO₂ into sugar.',
    rows: [
      ['In which organelle does photosynthesis happen?', 'Chloroplast', 'Chloroplasts contain stacked thylakoid membranes, where light is captured, surrounded by fluid stroma, where sugar is built.', 'It is green because of its pigment.', ['Mitochondrion', 'Nucleus', 'Vacuole'], ['chloroplasts']],
      ['Which pigment absorbs most of the light used in photosynthesis?', 'Chlorophyll', 'Chlorophyll absorbs red and blue light strongly and reflects green, which is why leaves look green.', 'Its name comes from the Greek for “green leaf”.', ['Hemoglobin', 'Melanin', 'Keratin'], ['chlorophyll a']],
      ['Where do the light-dependent reactions happen?', 'Thylakoid membranes', 'Photosystems in the thylakoid membranes capture light, split water and make ATP and NADPH.', 'The stacked discs inside the chloroplast.', ['Stroma', 'Cell wall', 'Cytoplasm'], ['thylakoid', 'thylakoids']],
      ['Where does the Calvin cycle fix CO₂ into sugar?', 'Stroma', 'The Calvin cycle runs in the stroma, spending ATP and NADPH from the light reactions to build sugar from CO₂.', 'The fluid around the thylakoid stacks.', ['Thylakoid lumen', 'Mitochondrial matrix', 'Nucleus'], ['the stroma']],
      ['Where does the oxygen released by photosynthesis come from?', 'Water', 'Photosystem II splits water molecules to replace lost electrons, releasing O₂ as a by-product.', 'Not from carbon dioxide, which surprises many people.', ['Carbon dioxide', 'Glucose', 'Chlorophyll'], ['H2O', 'h₂o']],
      ['Which enzyme fixes CO₂ in the Calvin cycle?', 'Rubisco', 'Rubisco attaches CO₂ to a five-carbon sugar. It is thought to be the most abundant protein on Earth.', 'Short for ribulose bisphosphate carboxylase.', ['ATP synthase', 'Amylase', 'Helicase'], ['RuBisCO']],
    ],
  },
  {
    id: 'bio-dna', subjectId: 'bio', title: 'DNA & Replication', x: 260, y: 230, links: ['bio-cell'], profile: 'progress',
    summary: 'DNA is a double helix of paired bases (A–T, C–G). Replication is semiconservative: helicase unwinds it and DNA polymerase builds each new strand 5′ to 3′.',
    rows: [
      ['What are the four bases in DNA?', 'Adenine, thymine, cytosine, guanine', 'DNA uses A, T, C and G. RNA swaps thymine for uracil.', 'One of them is swapped for uracil in RNA.', ['Adenine, uracil, cytosine, guanine', 'Alanine, thymine, cysteine, glycine', 'Adenine, thymine, cytosine, glucose']],
      ['Which base pairs with adenine in DNA?', 'Thymine', 'A pairs with T through two hydrogen bonds; C pairs with G through three.', 'A and T go together.', ['Uracil', 'Cytosine', 'Guanine'], ['T']],
      ['What shape describes the DNA molecule?', 'Double helix', 'Two antiparallel strands twist around each other. Watson and Crick described it in 1953, relying on Rosalind Franklin’s X-ray images.', 'Two strands, twisted.', ['Single strand', 'Triple helix', 'Beta sheet']],
      ['Which enzyme unwinds DNA during replication?', 'Helicase', 'Helicase breaks the hydrogen bonds between bases, opening a replication fork.', 'Its name refers to the helix it opens.', ['Ligase', 'Primase', 'DNA polymerase']],
      ['Which enzyme adds nucleotides to a new DNA strand?', 'DNA polymerase', 'DNA polymerase adds nucleotides only to a 3′ end, so new strands grow 5′ to 3′.', 'It polymerizes nucleotides.', ['Helicase', 'Ligase', 'RNA polymerase']],
      ['Why is DNA replication called semiconservative?', 'Each new molecule keeps one old strand', 'Each daughter molecule has one original strand and one new strand, as Meselson and Stahl showed in 1958.', 'Half old, half new.', ['Both old strands stay together', 'Both strands are fully new', 'Only the genes are copied']],
      ['What are the short DNA pieces on the lagging strand called?', 'Okazaki fragments', 'The lagging strand is built in short pieces away from the fork, then joined by DNA ligase.', 'Named after the scientists who found them.', ['Primers', 'Introns', 'Plasmids'], ['okazaki']],
    ],
  },
  {
    id: 'bio-expr', subjectId: 'bio', title: 'Gene Expression', x: 160, y: 150, links: ['bio-dna'], profile: 'new',
    summary: 'Genes are expressed in two steps: transcription copies DNA into mRNA in the nucleus, and translation reads mRNA codons at the ribosome to build a protein.',
    rows: [
      ['What is the process of making mRNA from DNA?', 'Transcription', 'RNA polymerase reads the template strand in the nucleus and builds a matching mRNA.', 'Like copying text by hand into the same language.', ['Translation', 'Replication', 'Mutation']],
      ['What is the process of building a protein from mRNA?', 'Translation', 'Ribosomes read mRNA codons and tRNAs bring the matching amino acids.', 'Converting from the language of bases into amino acids.', ['Transcription', 'Replication', 'Splicing']],
      ['How many nucleotides make up one codon?', '3', 'Each codon is three bases, giving 64 combinations for 20 amino acids plus stop signals.', 'Codons are triplets.', ['1', '2', '4'], ['three']],
      ['Which codon starts translation?', 'AUG', 'AUG codes for methionine and marks where the ribosome begins reading.', 'It codes for methionine.', ['UAA', 'UGA', 'GGG']],
      ['Which base replaces thymine in RNA?', 'Uracil', 'RNA uses uracil (U), which pairs with adenine.', 'Starts with U.', ['Cytosine', 'Guanine', 'Adenine'], ['U']],
      ['Which molecule brings amino acids to the ribosome?', 'tRNA', 'Each tRNA carries one amino acid and has an anticodon that pairs with an mRNA codon.', 'Transfer RNA.', ['mRNA', 'rRNA', 'DNA'], ['transfer RNA']],
    ],
  },
  {
    id: 'bio-inherit', subjectId: 'bio', title: 'Inheritance', x: 340, y: 120, links: ['bio-dna'], profile: 'new',
    summary: 'Genes come in versions called alleles. Mendel’s crosses showed dominant and recessive patterns: an Aa × Aa cross gives a 3 : 1 phenotype ratio.',
    rows: [
      ['What are different versions of the same gene called?', 'Alleles', 'Alleles are alternative forms of a gene at the same location on a chromosome.', 'For example, A and a.', ['Codons', 'Chromosomes', 'Traits'], ['allele']],
      ['What do we call an organism with two identical alleles for a trait?', 'Homozygous', 'Homozygous means AA or aa. Heterozygous means Aa.', '“Homo” means same.', ['Heterozygous', 'Hemizygous', 'Recessive']],
      ['Aa × Aa with complete dominance gives what phenotype ratio?', '3:1', 'The offspring are 1 AA : 2 Aa : 1 aa, so 3 show the dominant trait for every 1 recessive.', 'Draw a Punnett square and count the dominant boxes.', ['1:1', '9:3:3:1', '1:2:1'], ['3 to 1', '3 : 1']],
      ['Whose pea plant experiments founded genetics?', 'Gregor Mendel', 'Mendel’s 1860s crosses revealed the laws of segregation and independent assortment.', 'An Augustinian friar.', ['Charles Darwin', 'Thomas Hunt Morgan', 'Rosalind Franklin'], ['Mendel']],
      ['What is the word for the observable trait an organism shows?', 'Phenotype', 'The phenotype is what you can observe. The genotype is the underlying alleles.', 'Compare it with genotype.', ['Genotype', 'Allele', 'Karyotype']],
      ['From Aa × aa, what fraction of offspring are aa?', '1/2', 'Half the offspring get a from both parents (aa); half get A from the Aa parent (Aa).', 'Only one parent can pass on A.', ['1/4', '3/4', '0'], ['half', '50%', '0.5']],
    ],
  },
  {
    id: 'bio-evo', subjectId: 'bio', title: 'Natural Selection', x: 450, y: 210, links: ['bio-inherit'], profile: 'new',
    summary: 'Individuals with heritable traits that improve survival and reproduction leave more offspring, so those traits become more common over generations.',
    rows: [
      ['Who proposed natural selection alongside Darwin?', 'Alfred Russel Wallace', 'Wallace reached the idea independently; their papers were presented together in 1858.', 'He worked in the Malay Archipelago.', ['Gregor Mendel', 'Jean-Baptiste Lamarck', 'Carl Linnaeus'], ['Wallace']],
      ['What does natural selection act on directly?', 'Phenotypes', 'Selection acts on traits that affect survival and reproduction. Allele frequencies change as a result.', 'What the environment can “see”.', ['Genotypes only', 'Mutation rates', 'Species names'], ['phenotype']],
      ['A human arm and a whale flipper are examples of what?', 'Homologous structures', 'They share an ancestral bone layout but serve different functions, which is evidence of common descent.', 'Same origin, different use.', ['Analogous structures', 'Vestigial structures', 'Convergent traits'], ['homologous']],
      ['What does evolutionary fitness measure?', 'Reproductive success', 'Fitness is how many offspring survive to reproduce, not how strong or long-lived an individual is.', 'Think about descendants.', ['Physical strength', 'Lifespan', 'Body size']],
      ['What is random change in allele frequency, strongest in small populations?', 'Genetic drift', 'Chance events change allele frequencies, and the effect grows as population size shrinks.', 'It happens by luck, not advantage.', ['Gene flow', 'Natural selection', 'Mutation'], ['drift']],
      ['Antibiotic resistance spreading through bacteria is an example of what?', 'Natural selection', 'Antibiotics kill susceptible bacteria; resistant ones survive and multiply, so resistance becomes common.', 'The drug acts as the selective pressure.', ['Genetic drift', 'Gene flow', 'Artificial selection']],
    ],
  },
  // Astronomy
  {
    id: 'astro-solar', subjectId: 'astro', title: 'The Solar System', x: 640, y: 450, links: [], profile: 'mastered',
    summary: 'Eight planets orbit the Sun: four rocky inner planets, the asteroid belt, four giant outer planets, then the Kuiper Belt with dwarf planets such as Pluto.',
    rows: [
      ['Which is the largest planet in the Solar System?', 'Jupiter', 'Jupiter has more than twice the mass of all the other planets combined.', 'It has the Great Red Spot.', ['Saturn', 'Neptune', 'Earth']],
      ['Which planet is closest to the Sun?', 'Mercury', 'Mercury orbits at about 0.39 AU and has almost no atmosphere.', 'The smallest planet.', ['Venus', 'Mars', 'Earth']],
      ['The main asteroid belt lies between which two planets?', 'Mars and Jupiter', 'Jupiter’s gravity kept the material there from forming a planet.', 'Between the rocky planets and the giants.', ['Earth and Mars', 'Jupiter and Saturn', 'Uranus and Neptune']],
      ['Since 2006, how has Pluto been classified?', 'Dwarf planet', 'The IAU reclassified Pluto because it has not cleared its orbit of other objects.', 'Not quite a full planet.', ['Moon', 'Asteroid', 'Comet']],
      ['About how long does sunlight take to reach Earth?', 'About 8 minutes', 'At 1 AU, light takes about 8 minutes 20 seconds to arrive.', 'Less than a coffee break.', ['8 seconds', '8 hours', '1 day'], ['8 minutes', '8 min', 'eight minutes']],
      ['Which is the largest moon in the Solar System?', 'Ganymede', 'Jupiter’s moon Ganymede is larger than the planet Mercury.', 'It orbits the largest planet.', ['Titan', 'Europa', 'The Moon']],
    ],
  },
  {
    id: 'astro-light', subjectId: 'astro', title: 'Light & Telescopes', x: 580, y: 300, links: ['astro-solar'], profile: 'progress',
    summary: 'Nearly everything we know about space comes from light. Spectra reveal composition and motion; space telescopes avoid the blurring and absorption of the atmosphere.',
    rows: [
      ['About how fast does light travel?', '300,000 km/s', 'The exact value is 299,792 km/s in a vacuum.', 'Around seven times around Earth per second.', ['30,000 km/s', '3,000,000 km/s', '300 km/s'], ['300000 km/s', '300,000 km per second', '3e8 m/s']],
      ['A light-year is a unit of what?', 'Distance', 'It is how far light travels in one year, about 9.46 trillion km.', 'Despite the name, it is not time.', ['Time', 'Brightness', 'Mass']],
      ['What does redshift in a galaxy’s spectrum tell us?', 'It is moving away from us', 'Light from a receding source is stretched to longer, redder wavelengths.', 'Stretched wavelengths.', ['It is moving toward us', 'It is very hot', 'It is very young']],
      ['Why are some telescopes placed in space?', 'To avoid atmospheric blurring and absorption', 'The atmosphere blurs images and blocks much of the infrared, ultraviolet and X-ray light.', 'Think about what air does to starlight.', ['To be closer to the stars', 'Because space is darker at noon', 'To avoid magnetic fields']],
      ['What is splitting light into its wavelengths to study it called?', 'Spectroscopy', 'Spectra reveal temperature, composition and motion through absorption and emission lines.', 'It uses a spectrum.', ['Photometry', 'Interferometry', 'Astrometry']],
      ['Which space telescope launched in 2021 observes mainly in infrared?', 'James Webb Space Telescope', 'JWST’s 6.5 m gold-coated mirror sits near the Sun–Earth L2 point.', 'Named after a former NASA administrator.', ['Hubble Space Telescope', 'Chandra X-ray Observatory', 'Kepler'], ['JWST', 'James Webb', 'Webb']],
    ],
  },
  {
    id: 'astro-stars', subjectId: 'astro', title: 'Stellar Properties', x: 700, y: 200, links: ['astro-light'], profile: 'review',
    summary: 'Stars are sorted by temperature and luminosity on the H-R diagram. Most, including the Sun, sit on the main sequence, fusing hydrogen into helium.',
    rows: [
      ['The H-R diagram plots luminosity against what?', 'Surface temperature', 'Temperature runs hot-to-cool from left to right, with luminosity on the vertical axis.', 'Linked to a star’s color.', ['Distance', 'Age', 'Mass'], ['temperature']],
      ['What color are the hottest stars?', 'Blue', 'Hotter objects peak at shorter wavelengths. O and B stars glow blue-white.', 'Think of the hottest part of a flame.', ['Red', 'Yellow', 'Orange']],
      ['What powers the Sun?', 'Nuclear fusion of hydrogen into helium', 'In the core, hydrogen nuclei fuse into helium, converting a little mass into energy (E = mc²).', 'Nuclei join together.', ['Burning of gases', 'Gravitational collapse alone', 'Radioactive decay'], ['fusion', 'nuclear fusion']],
      ['On which H-R diagram band do most stars, including the Sun, lie?', 'Main sequence', 'Stars spend about 90% of their lives on the main sequence, fusing hydrogen in their cores.', 'The diagonal band.', ['Giant branch', 'White dwarf region', 'Horizontal branch']],
      ['What property mainly decides a star’s life story?', 'Its mass', 'Mass sets core temperature, fusion rate, lifespan and final fate.', 'Heavier stars live fast and die young.', ['Its color', 'Its distance', 'Its age'], ['mass']],
      ['What spectral type is the Sun?', 'G-type', 'The Sun is a G2V star: a yellow main-sequence star about 5,800 K at the surface.', 'Between F and K.', ['O-type', 'M-type', 'B-type'], ['G', 'G2V', 'G type']],
    ],
  },
  {
    id: 'astro-life', subjectId: 'astro', title: 'Life of Stars', x: 820, y: 290, links: ['astro-stars'], profile: 'new',
    summary: 'Stars form in collapsing gas clouds. Sun-like stars swell into red giants and end as white dwarfs; massive stars explode as supernovae, leaving neutron stars or black holes.',
    rows: [
      ['Where do stars form?', 'Nebulae', 'Cold, dense molecular clouds collapse under gravity into protostars.', 'Clouds of gas and dust.', ['Black holes', 'Asteroid belts', 'Planetary rings'], ['nebula', 'molecular clouds', 'molecular cloud']],
      ['After the main sequence, a Sun-like star swells into what?', 'Red giant', 'When core hydrogen runs out, the core contracts and the outer layers expand and cool.', 'Big and cool.', ['White dwarf', 'Neutron star', 'Blue supergiant']],
      ['What will the Sun finally become?', 'White dwarf', 'After shedding its outer layers as a planetary nebula, the hot core remains as an Earth-sized white dwarf.', 'Small, dense and white-hot.', ['Black hole', 'Neutron star', 'Supernova']],
      ['What is the explosive death of a massive star called?', 'Supernova', 'When a massive star’s iron core collapses, it rebounds into an explosion that can outshine a galaxy.', 'Brighter than a nova.', ['Nova', 'Solar flare', 'Pulsar']],
      ['What is the collapsed core made almost entirely of neutrons called?', 'Neutron star', 'A neutron star packs more than the Sun’s mass into a sphere about 20 km across.', 'Named after its particles.', ['White dwarf', 'Brown dwarf', 'Quasar']],
      ['What object has an escape velocity greater than the speed of light?', 'Black hole', 'Inside the event horizon, nothing, not even light, can escape.', 'Nothing gets out.', ['Neutron star', 'Pulsar', 'Magnetar']],
    ],
  },
  {
    id: 'astro-galaxy', subjectId: 'astro', title: 'Galaxies', x: 870, y: 440, links: ['astro-life'], profile: 'new',
    summary: 'Galaxies are vast systems of stars, gas and dark matter. Ours, the Milky Way, is a barred spiral with a supermassive black hole at its center.',
    rows: [
      ['What is the name of our galaxy?', 'Milky Way', 'The Milky Way holds an estimated 100 to 400 billion stars.', 'Named for its look across the night sky.', ['Andromeda', 'Triangulum', 'Sombrero']],
      ['What type of galaxy is the Milky Way?', 'Barred spiral', 'It has spiral arms and a central bar of stars.', 'Spiral, with a straight feature at the middle.', ['Elliptical', 'Irregular', 'Lenticular'], ['barred spiral galaxy']],
      ['What sits at the center of the Milky Way?', 'A supermassive black hole', 'Sagittarius A* has about 4 million solar masses; the Event Horizon Telescope imaged it in 2022.', 'Called Sagittarius A*.', ['A neutron star', 'A giant red star', 'An empty void'], ['Sagittarius A*', 'Sgr A*', 'black hole', 'supermassive black hole']],
      ['What is the nearest large spiral galaxy to ours?', 'Andromeda', 'Andromeda (M31) is about 2.5 million light-years away and approaching us.', 'Also called M31.', ['Large Magellanic Cloud', 'Whirlpool', 'Centaurus A'], ['M31', 'Andromeda Galaxy']],
      ['Which observation provides key evidence for dark matter?', 'Galaxy rotation curves', 'Outer stars orbit too fast for the visible mass alone; extra unseen mass is needed.', 'Look at how fast the outer stars move.', ['Solar eclipses', 'Comet tails', 'Planet colors']],
      ['Hubble classified galaxies as elliptical, spiral and what?', 'Irregular', 'Irregular galaxies have no clear shape, often from interactions or mergers.', 'No regular shape.', ['Circular', 'Binary', 'Nebular']],
    ],
  },
  {
    id: 'astro-cosmo', subjectId: 'astro', title: 'Cosmology', x: 790, y: 540, links: ['astro-galaxy'], profile: 'new',
    summary: 'The universe began about 13.8 billion years ago in a hot, dense state and has expanded ever since. Its expansion is now accelerating, driven by dark energy.',
    rows: [
      ['About how old is the universe?', '13.8 billion years', 'Measurements of the cosmic microwave background give an age of about 13.8 billion years.', 'A bit under 14 billion.', ['4.6 billion years', '100 billion years', '6,000 years'], ['13.8 billion', '13.8']],
      ['What is the leftover radiation from the early universe called?', 'Cosmic microwave background', 'Released about 380,000 years after the Big Bang, it now fills space at about 2.7 K.', 'It peaks in the microwave band.', ['Gamma-ray burst', 'Solar wind', 'Cosmic rays'], ['CMB', 'CMB radiation']],
      ['Under Hubble’s law, how do more distant galaxies recede?', 'Faster', 'Recession speed grows in proportion to distance (v = H₀d).', 'Speed scales with distance.', ['Slower', 'At the same speed', 'They approach us']],
      ['What is the accelerating expansion of the universe attributed to?', 'Dark energy', 'Supernova surveys in 1998 found the expansion speeding up; dark energy is the name for the cause.', 'Not dark matter.', ['Dark matter', 'Black holes', 'Cosmic strings']],
      ['What is the most abundant element in the universe?', 'Hydrogen', 'Hydrogen makes up about 74% of ordinary matter by mass.', 'Element number 1.', ['Helium', 'Oxygen', 'Carbon']],
      ['What is the theory that the universe began in a hot, dense state?', 'Big Bang', 'Evidence includes the CMB, the abundance of light elements and the expansion of space.', 'Named, at first mockingly, by Fred Hoyle.', ['Steady State', 'Inflationary multiverse', 'Big Crunch'], ['big bang theory']],
    ],
  },
];

export interface SeedResult {
  subjects: Subject[];
  decks: Deck[];
  cards: Record<string, Card>;
  cardStates: Record<string, CardState>;
  player: Player;
}

export function buildSeed(now = Date.now(), withProgress = true): SeedResult {
  const subjects = SEED_SUBJECTS.map((s) => ({ ...s, createdAt: now - 20 * DAY }));
  const decks: Deck[] = [];
  const cards: Record<string, Card> = {};
  const cardStates: Record<string, CardState> = {};
  DECKS.forEach((d, di) => {
    decks.push({
      id: d.id,
      subjectId: d.subjectId,
      title: d.title,
      summary: d.summary,
      source: { kind: 'seed', title: 'StudyQuest starter deck' },
      x: d.x,
      y: d.y,
      links: d.links,
      createdAt: now - (20 - di) * DAY,
      lastStudied:
        !withProgress || d.profile === 'new' ? undefined : now - (d.profile === 'review' ? 2 : d.profile === 'progress' ? 1 : 4) * DAY,
    });
    d.rows.forEach((r, i) => {
      const id = `${d.id}-${i + 1}`;
      cards[id] = {
        id,
        deckId: d.id,
        front: r[0],
        back: r[1],
        detail: r[2],
        hint: r[3],
        distractors: r[4],
        aliases: r[5] ?? [],
        createdAt: now - 20 * DAY,
      };
      const s = freshState(now);
      if (!withProgress) {
        // Fresh start: every card new.
      } else if (d.profile === 'mastered') {
        Object.assign(s, {
          seen: true, reps: 4, interval: 12 + i, ease: 2.6, demonstrated: true,
          due: now + (3 + i) * DAY, lastReviewed: now - 6 * DAY,
        });
      } else if (d.profile === 'review') {
        const proven = i < 3;
        Object.assign(s, {
          seen: true, reps: proven ? 2 : 1, interval: proven ? 4 : 1, ease: 2.4, demonstrated: proven,
          due: i % 2 === 0 ? now - (1 + (i % 3)) * 3_600_000 * 8 : now + (1 + i) * DAY,
          lastReviewed: now - 3 * DAY, lapses: i === 4 ? 1 : 0,
        });
      } else if (d.profile === 'progress' && i < 3) {
        Object.assign(s, {
          seen: true, reps: 1, interval: 1, demonstrated: i === 0,
          due: now + (i + 1) * 0.6 * DAY, lastReviewed: now - DAY,
        });
      }
      cardStates[id] = s;
    });
  });
  const player = newPlayer();
  if (!withProgress) return { subjects, decks, cards, cardStates, player };
  player.xp = 520;
  player.streak = 2;
  player.lastStudyDate = yesterdayKey(now);
  player.totals = { reviews: 64, correct: 41, improvements: 3, sessions: 7, bossWins: 0 };
  player.achievements = { 'first-quest': now - 9 * DAY };
  return { subjects, decks, cards, cardStates, player };
}
