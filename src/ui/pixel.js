// Pixel-art toolkit: string-grid icons with an automatic ink outline,
// generated 9-slice frames for chunky buttons & panels, and eki-style stamps.

const INK = '#2a2140';

// Shared colour keys (icons may override any key).
const KEYS = {
  k: INK, x: '#1d1828', w: '#ffffff', W: '#fff4dc',
  y: '#ffd23f', Y: '#ffe98a', o: '#e88a1a', O: '#c45a1a',
  r: '#ef4a4a', R: '#b02a3a', p: '#ff8fb5', P: '#e05a8a', q: '#ffc4d8',
  g: '#7cc56b', G: '#3f8a4f', h: '#b6e89a', m: '#9ccf5c',
  b: '#5fb4ff', B: '#2f6fc1', c: '#8ee6ff',
  n: '#b5743f', N: '#7a4526', t: '#e8b07a', T: '#f6d6a8',
  s: '#d4d1e0', S: '#8a86a0', v: '#a98bff', V: '#6a4fc4', l: '#d8c9ff', e: '#5a5170',
};

// ---------------------------------------------------------------------------
// Icon definitions. Rows are drawn as-is; an outline is added around the
// silhouette automatically (so icons are designed without outlines).

export const ICONS = {
  coin: { rows: [
    '..yyyyyy..',
    '.yWWyyyyy.',
    'yWyyyooyyy',
    'yWyyooooyo',
    'yyyyooooyo',
    'yyyyyooyyo',
    'yyyyyyyyyo',
    'oyyyyyyyoo',
    '.ooyyyyoo.',
    '..oooooo..',
  ] },
  heart: { rows: [
    '.rr...rr.',
    'rwrr.rrrr',
    'rwrrrrrrr',
    'rrrrrrrrR',
    '.rrrrrrR.',
    '..rrrrR..',
    '...rrR...',
    '....R....',
  ] },
  heartEmpty: { rows: [
    '.ee...ee.',
    'eeee.eeee',
    'eeeeeeeee',
    'eeeeeeeee',
    '.eeeeeee.',
    '..eeeee..',
    '...eee...',
    '....e....',
  ] },
  paw: { rows: [
    '..pp....pp..',
    '.pppp..pppp.',
    '.pqpp..pqpp.',
    'p.pp....pp.p',
    'pp........pp',
    'pp...pp...pp',
    '...pppppp...',
    '..pqpppppp..',
    '.pqpppppppp.',
    '.pppppppppp.',
    '..pppppppp..',
  ], keys: { p: '#ff7fa8', q: '#ffc0d4' } },
  flame: { rows: [
    '....o....',
    '...oo....',
    '...ooo...',
    '..oooo.o.',
    '.ooyooooo',
    '.ooyyoooo',
    'ooyyyyooo',
    'ooyWyyyoo',
    'ooyWWyyoo',
    '.ooyyyoo.',
    '..ooooo..',
  ], keys: { o: '#ff6a3d', y: '#ffd23f', W: '#fff6c8' } },
  bowl: { rows: [
    '..w.w.w...',
    '...w.w.w..',
    '..........',
    'yyyyyyyyyy',
    'rrrrrrrrrr',
    'rwrrrrrrrR',
    '.rrrrrrrR.',
    '..rrrrRR..',
    '...RRRR...',
  ] },
  pig: { rows: [
    '....p.........',
    '....pp........',
    '...ppppkkkpp..',
    '..ppppppppppp.',
    'PPPpkppppppppP',
    'PkPppbpppppppP',
    'PPPpppppppppp.',
    '..pppppppppdd.',
    '...dpppppppd..',
    '...dd....dd...',
    '...dd....dd...',
  ], keys: { p: '#ffaccb', P: '#ff86ae', d: '#e57aa0', b: '#ff7f9f' } },
  pin: { rows: [
    '..rrrrrr..',
    '.rwwrrrrr.',
    'rwrrrrrrrR',
    'rwrrWWrrrR',
    'rrrWWWWrrR',
    'rrrWWWWrrR',
    'rrrrWWrrrR',
    '.rrrrrrrR.',
    '..rrrrrR..',
    '...rrrR...',
    '....rR....',
  ] },
  scroll: { rows: [
    '.TTTTTTTTT.',
    'TWWWWWWWWTn',
    '.WkkkWkkWn.',
    '.WWWWWWWWn.',
    '.WkkWkkkWn.',
    '.WWWWWWWWn.',
    '.WkkkkWkWn.',
    '.WWWWWWWWn.',
    'TWWWWWWWWTn',
    '.TTTTTTTTT.',
  ], keys: { T: '#e8b07a', n: '#d9c6a5', k: '#8a7a9a' } },
  shop: { rows: [
    'rwrwrwrwrwrw',
    'rwrwrwrwrwrw',
    '.rwrwrwrwrw.',
    '.ssssssssss.',
    '.sbbsbbssns.',
    '.sbcsbcssns.',
    '.ssssssssns.',
    '.ssssssssns.',
    '.SSSSSSSSSS.',
  ], keys: { s: '#f2efe8', S: '#b7b2c6', n: '#a8683a' } },
  book: { rows: [
    'PPPPPPPPPP.',
    'PqqqqqqqqPw',
    'PqPPPPPPqPw',
    'PqPwwwwPqPw',
    'PqPPPPPPqPw',
    'PqqqqqqqqPw',
    'PqqqqqqqqPw',
    'PqqqqqqqqPw',
    'PqqqqqqqqPw',
    'PPPPPPPPPPw',
    '.wwwwwwwwww',
  ], keys: { P: '#e05a8a', q: '#ff8fb5' } },
  buddy: { rows: [
    'n........n',
    'nn......nn',
    'nnnnnnnnnn',
    'nnnnnnnnnn',
    'nkknnnnkkn',
    'nkWnnnnkWn',
    'nnqnTTnqnn',
    'nnnTTTTnnn',
    '.nnTkkTnn.',
    '..nnnnnn..',
  ], keys: { n: '#eba155', T: '#fff4e4', q: '#ff9db5' } },
  gear: { rows: [
    '....ss....',
    '.s.ssss.s.',
    '.ssssssss.',
    '..sseess..',
    'ssse..esss',
    'ssse..esss',
    '..sseess..',
    '.ssssssss.',
    '.s.ssss.s.',
    '....ss....',
  ] },
  close: { rows: [
    'ww......ww',
    'www....www',
    '.www..www.',
    '..wwwwww..',
    '...wwww...',
    '...wwww...',
    '..wwwwww..',
    '.www..www.',
    'www....www',
    'ww......ww',
  ] },
  check: { rows: [
    '........gg',
    '.......ggg',
    '......ggg.',
    'gg...ggg..',
    'ggg.ggg...',
    '.ggggg....',
    '..ggg.....',
    '...g......',
  ] },
  lock: { rows: [
    '...ssss...',
    '..s....s..',
    '..s....s..',
    '..s....s..',
    '.yyyyyyyy.',
    '.yWyyyyyo.',
    '.yyykkyyo.',
    '.yyykkyyo.',
    '.yyyyyyyo.',
    '.oooooooo.',
  ] },
  star: { rows: [
    '....y....',
    '....y....',
    '...yWy...',
    'yyyyWyyyy',
    '.yyyyyyy.',
    '..yyyyo..',
    '..yyoyo..',
    '.yyo.oyo.',
    '.yo...oo.',
  ] },
  torii: { rows: [
    'rrrrrrrrrrrr',
    '.RRRRRRRRRR.',
    '..r......r..',
    'rrrrrrrrrrrr',
    '..r......r..',
    '..r......r..',
    '..r......r..',
    '..r......r..',
    '.xx......xx.',
  ] },
  omikuji: { rows: [
    '....nn....',
    '....nn....',
    '..rrrrrr..',
    '.rrrrrrrr.',
    '.rWWrrrrr.',
    '.rWWrrrrr.',
    '.rrrrrrrr.',
    '.rrrrrrrr.',
    '.RRRRRRRR.',
  ], keys: { n: '#f6d6a8' } },
  target: { rows: [
    '....bb....',
    '..bbbbbb..',
    '.bb.bb.bb.',
    '.b..bb..b.',
    'bbbbwwbbbb',
    'bbbbwwbbbb',
    '.b..bb..b.',
    '.bb.bb.bb.',
    '..bbbbbb..',
    '....bb....',
  ] },
  globe: { rows: [
    '...bbbb...',
    '.bbgggbbb.',
    '.bgggggbb.',
    'bbggggbbbb',
    'bbbgggbbgb',
    'bbbbgbbggb',
    'bbbbbbgggb',
    '.bbbbbggb.',
    '.bbbbbbbb.',
    '...bbbb...',
  ] },
  sun: { rows: [
    '....y....',
    '.y..y..y.',
    '..yyyyy..',
    '..yWyyy..',
    'yyyyyyyyy',
    '..yyyyy..',
    '..yyyyy..',
    '.y..y..y.',
    '....y....',
  ] },
  moon: { rows: [
    '...yyy...',
    '.yyyy....',
    '.yyy.....',
    'yyyy.....',
    'yyyy.....',
    'yyyyy....',
    '.yyyyy..y',
    '.yyyyyyyy',
    '...yyyy..',
  ] },
  train: { rows: [
    '.ssssssss.',
    'ssssssssss',
    'sbbsbbsbbs',
    'sbbsbbsbbs',
    'gggggggggg',
    'ssssssssss',
    'sWssssssWs',
    'SSSSSSSSSS',
    '.xx....xx.',
  ] },
  stamp: { rows: [
    '...nnnn...',
    '...nnnn...',
    '....nn....',
    '....nn....',
    '..rrrrrr..',
    '.rrrrrrrr.',
    'rrrrrrrrrr',
    'RRRRRRRRRR',
  ] },
  walk: { rows: [
    '...pp.......',
    '..pppp......',
    '..pppp......',
    '...pp...pp..',
    '.......pppp.',
    '.......pppp.',
    '..pp....pp..',
    '.pppp.......',
    '.pppp.......',
    '..pp........',
  ], keys: { p: '#ff7fa8' } },
  plus: { rows: ['...ww...', '...ww...', '...ww...', 'wwwwwwww', 'wwwwwwww', '...ww...', '...ww...', '...ww...'] },
  left: { rows: ['....ww', '...www', '..www.', '.www..', 'www...', 'www...', '.www..', '..www.', '...www', '....ww'] },
  right: { rows: ['ww....', 'www...', '.www..', '..www.', '...www', '...www', '..www.', '.www..', 'www...', 'ww....'] },
  sparkle: { rows: ['...y...', '...y...', '..yWy..', 'yyWWWyy', '..yWy..', '...y...', '...y...'] },
  gift: { rows: [
    '.rr..rr.',
    'r..rr..r',
    '.rrrrrr.',
    'yyyrryyy',
    'yyyrryyy',
    '.yyrryy.',
    '.yyrryy.',
    '.yyrryy.',
    '.oorroo.',
  ] },
  hanger: { rows: [
    '....ss....',
    '...s..s...',
    '......s...',
    '.....s....',
    '....ss....',
    '..ssssss..',
    '.ss....ss.',
    'ss......ss',
    'ssssssssss',
  ] },
  leaf: { rows: ['......gg', '....gggg', '..gggggg', '.ggGgggg', 'gggGggg.', 'ggGggg..', '.Ggg....', 'G.......'] },
  bolt: { rows: ['....yy', '...yy.', '..yy..', '.yyyyy', 'yyyyy.', '...yy.', '..yy..', '.yy...', 'yy....'] },
  // Landmark glyphs (used on labels & stamps)
  tower: { rows: [
    '....r....',
    '....r....',
    '...rwr...',
    '...rrr...',
    '...r.r...',
    '..rwwwr..',
    '..r...r..',
    '.rr...rr.',
    '.r.....r.',
    'rr.....rr',
  ] },
  cross: { rows: [
    'SwSwSwSwSS',
    'SSSSSSSSSS',
    'wSwSSSSwSw',
    'SSSwSSwSSS',
    'wSSSwwSSSw',
    'SSSSwwSSSS',
    'wSSwSSwSSw',
    'SSwSSSSwSS',
    'SSSSSSSSSS',
    'SwSwSwSwSS',
  ], keys: { S: '#5a566a' } },
  castle: { rows: [
    '....gg....',
    '..gggggg..',
    '...wwww...',
    '.gggggggg.',
    '..wwwwww..',
    '..wkwwkw..',
    'ssssssssss',
    'ssssssssss',
  ], keys: { g: '#5f8d6d' } },
  clock: { rows: [
    '..ssss..',
    '.swwwws.',
    'swwkwwws',
    'swwkwwws',
    'swwkkkws',
    'swwwwwws',
    '.swwwws.',
    '..ssss..',
  ] },
  fish: { rows: [
    '..bbbbb.....',
    '.bbbbbbbb..b',
    'bbwbbbbbbbbb',
    'bbbbbbbbbbbb',
    '.cccccccc..c',
    '..ccccc.....',
  ] },
  panda: { rows: [
    'xx......xx',
    'xxwwwwwwxx',
    '.wwwwwwww.',
    'wxxwwwwxxw',
    'wxwwwwwxww',
    'wwwwxxwwww',
    '.wwwwwwww.',
    '..wwwwww..',
  ] },
  lantern: { rows: [
    '...xxxx...',
    '..rrrrrr..',
    '.rrwrrrrr.',
    'rrwrrrrrrR',
    'rrrrrrrrrR',
    'rrrrrrrrrR',
    '.rrrrrrrR.',
    '..rrrrrR..',
    '...xxxx...',
  ] },
  wheel: { rows: [
    '....yyy....',
    '..pp.s.bb..',
    '.p...s...b.',
    '.p.s.s.s.b.',
    'r...sss...g',
    'rssssWssssg',
    'r...sss...g',
    '.v.s.s.s.c.',
    '.v...s...c.',
    '..vv.s.cc..',
    '....sss....',
    '...s...s...',
    '..s.....s..',
  ], noOutline: true, keys: { s: '#e9edf5', W: '#ffffff' } },
  // ---- Foods (designed at ~14px) ----
  onigiri: { rows: [
    '......ww......',
    '.....wwww.....',
    '....wwwwww....',
    '...wwwwwwww...',
    '...wwwwwwwws..',
    '..wwxwwwwxwws.',
    '..wqwwxxwwqws.',
    '.wwwwwwwwwwwws',
    '.wwwGGGGGGwwws',
    'wwwwGGGGGGwwws',
    'wwwwGGGGGGwwws',
    'wwwwGGGGGGwwws',
    '.wwwGGGGGGwws.',
    '..ssGGGGGGss..',
  ], keys: { G: '#2f4a3a', s: '#dcd8e8' } },
  melonpan: { rows: [
    '....YYYYYY....',
    '..YYyYYYyYYY..',
    '.YYYyYYYyYYYY.',
    '.yyyyyyyyyyyy.',
    'YYYyYYYyYYYyYY',
    'YxYyYYYyYYxyYY',
    'yyyyyyxxyyyyyy',
    'YqYyYYYyYYYyqo',
    'YYYyYYYyYYYyoo',
    '.yyyyyyyyyyyo.',
    '.oYYyYYYyYYoo.',
    '..ooooooooooo.',
    '...oooooooo...',
  ], keys: { Y: '#fbe7a1', y: '#e8c069', o: '#d9963e' } },
  anpan: { rows: [
    '..............',
    '....tttttt....',
    '..ttTTtttttt..',
    '.tTTttwtttwttn',
    '.tTtttttttttn.',
    'ttttttNNttttnn',
    'ttxtttNNtttxnn',
    'tttttttttttttn',
    'tqtttxxttttqnn',
    '.ttttttttttnn.',
    '..nnnnnnnnnn..',
    '...nnnnnnnn...',
  ], keys: { t: '#d98a43', T: '#f2b56b', n: '#a85f27', N: '#6b3a1e', w: '#fff3d0' } },
  taiyaki: { rows: [
    '.............t',
    '...ttttttt..tt',
    '..tTTtttttttnt',
    '.tTxtttnttnttn',
    'tTttttntnttntt',
    'tttttnttntntnn',
    'qttttttnttnttt',
    '.tttntttntnttn',
    '..ttttnttttntt',
    '...nnnnnnn..nn',
    '.............n',
  ], keys: { t: '#e3a04c', T: '#f6c27a', n: '#b06a28' } },
  dango: { rows: [
    '.....aa.......',
    '....aaaa......',
    '....aaaa......',
    '.....aaW......',
    '....bbbb......',
    '...bbbbbb.....',
    '...bbbbbb.....',
    '....bbbW......',
    '....cccc......',
    '...cccccc.....',
    '...cccccc.....',
    '....cccW......',
    '......nn......',
    '......nn......',
  ], keys: { a: '#ffb3c8', b: '#fff6ee', c: '#a6d98a', n: '#c9a46f', W: '#ffffff' } },
  daifuku: { rows: [
    '......gg......',
    '.....rrrg.....',
    '....rrwrrr....',
    '...WWrrrrWW...',
    '..WWWWWWWWWW..',
    '.WWWWWWWWWWWW.',
    '.WWxWWWWWWxWW.',
    'WWqWWWxxWWWqWs',
    'WWWWWWWWWWWWWs',
    '.WWWWWWWWWWWs.',
    '..ssWWWWWWss..',
  ], keys: { W: '#fff8f4', s: '#e9dfe6', r: '#ff4f6a', w: '#ffd0d8' } },
  crepe: { rows: [
    '...pWWpbW.....',
    '..WpWWWWyW....',
    '..WWbWpWWW....',
    '...ttttttt....',
    '...tTttTtt....',
    '....tttTt.....',
    '....tTttt.....',
    '.....tttt.....',
    '.....tTt......',
    '......tt......',
    '......t.......',
  ], keys: { W: '#fffaf2', p: '#ff6f9a', b: '#7a6cff', y: '#ffd23f', t: '#e5a75c', T: '#c97f35' } },
  takoyaki: { rows: [
    '..............',
    '..nnn..nnn....',
    '.nNgnnnNnnn...',
    '.nnnnnnnnnnn..',
    'nnnn.nnngnnn..',
    'nnn..nNnnnnn..',
    'zzzzzzzzzzzzzz',
    'zZZZZZZZZZZZZz',
    '.zZZZZZZZZZZz.',
    '..zzzzzzzzzz..',
  ], keys: { n: '#c9853e', N: '#5a3a26', g: '#6ac06a', z: '#d9b98a', Z: '#efd5ad' } },
  tamagoyaki: { rows: [
    '..............',
    '....s.........',
    '....s.........',
    '..yyyyyyyy....',
    '..yYYYYYYy....',
    '..yyyyyyyy....',
    '..yYYYYYYy....',
    '..yyyyyyyyo...',
    '..oooooooo....',
    '....s.........',
    '....s.........',
    '....s.........',
  ], keys: { y: '#ffd84a', Y: '#ffe98a', o: '#e0a63a', s: '#d4bb8a' } },
  yakitori: { rows: [
    '.........nn...',
    '........NNnn..',
    '.......nnNN...',
    '......NNnn....',
    '.....nnNN.....',
    '....NNnn......',
    '...nnNN.......',
    '..ss..........',
    '.ss...........',
    'ss............',
  ], keys: { n: '#c26a2c', N: '#8a4520', s: '#e8d2a8' } },
  pandabun: { rows: [
    '.xx......xx...',
    'xxxx....xxxx..',
    'xxwwwwwwwwxx..',
    '.wwwwwwwwwww..',
    'wwxxwwwwxxwws.',
    'wwxWwwwwxWwws.',
    'wwwwwxxwwwwws.',
    'wqwwwwwwwwqws.',
    '.wwwwwwwwwws..',
    '..ssssssss....',
  ], keys: { w: '#fbfbfb', s: '#e0dce8' } },
  softserve: { rows: [
    '......W.......',
    '.....WWW......',
    '....WWWWW.....',
    '...WWWWWWs....',
    '....WWWWs.....',
    '..WWWWWWWWs...',
    '...WWWWWWs....',
    '...tttttt.....',
    '...tTtTtt.....',
    '....tTtt......',
    '....tttt......',
    '.....tt.......',
    '.....t........',
  ], keys: { W: '#fff8ec', s: '#ece0d6', t: '#e5a75c', T: '#c97f35' } },
  purin: { rows: [
    '.....rr.......',
    '....rrrr......',
    '...nnnnnn.....',
    '..yyyyyyyy....',
    '..yxyyyyxy....',
    '.yyqyxxyqyy...',
    '.yyyyyyyyyy...',
    'yyyyyyyyyyyy..',
    'ssssssssssssss',
    '.ssssssssssss.',
  ], keys: { y: '#ffde7a', n: '#8a4a1e', s: '#e6f2ff' } },
  kakigori: { rows: [
    '......ww......',
    '....wwrww.....',
    '...wrrrrrw....',
    '..wrrrrrrww...',
    '..rrrrwrrrr...',
    '.rrrrrrrrrr...',
    'cccccccccccc..',
    '.cbbbbbbbbc...',
    '..cbbbbbbc....',
    '....cccc......',
    '...cccccc.....',
  ], keys: { r: '#ff5f7a', c: '#bfe8ff', b: '#e8f6ff' } },
  ramen: { rows: [
    '...s....s.....',
    '....s..s......',
    '..y.g.pw.ny...',
    '.yyyyggpwwnyy.',
    'rrrrrrrrrrrrrr',
    'rwrrwrrwrrwrrR',
    '.rrrrrrrrrrrR.',
    '..rrrrrrrrrR..',
    '...RRRRRRRR...',
    '....RRRRRR....',
  ], keys: { y: '#ffd23f', g: '#7cc56b', p: '#ff9fb5', w: '#fff6e8', n: '#b5743f', s: '#e8e4f0', r: '#e8433a', R: '#a52a35' } },
  sushi: { rows: [
    '..............',
    '.ooooo..ppppp.',
    'oOoOooo.ppPPpp',
    'WWWWWWW.WWWWWW',
    'WWWWWWW.WWWWWW',
    '..............',
    '.xxxxx...yyyy.',
    'xWWrWWx..yYyy.',
    'xWrrrWx.xxxxx.',
    'xWWWWWx.WWWWW.',
    '.xxxxx..WWWWW.',
  ], keys: { o: '#ff8a5a', O: '#ffc0a0', p: '#ff6a7a', P: '#ffb0b8', W: '#fffaf2', y: '#ffd84a', Y: '#ffe98a', r: '#ff5a3a' } },
  ekiben: { rows: [
    'rrrrrrrrrrrrrr',
    'rWWWWWWnWWyyyr',
    'rWWWWWWnWyyyyr',
    'rWWWxWWnWgggpr',
    'rWWWWWWnggggpr',
    'rnnnnnnnnnnnnr',
    'roooooonppqqqr',
    'roOoooonpppqqr',
    'rrrrrrrrrrrrrr',
  ], keys: { r: '#c9443a', W: '#fffaf2', n: '#2a2140', y: '#ffd84a', g: '#7cc56b', p: '#ff9fb5', o: '#e88a3a', O: '#ffb070', q: '#c26a2c' } },
  omurice: { rows: [
    '....yyyyyy....',
    '..yyyyyyyyyy..',
    '.yyyrryyyyyyy.',
    'yyyrrrrrryyyyy',
    'yyyyyyrrryyyyy',
    'yyyyyyyyyyyyyy',
    'ssssssssssssss',
    '.ssssssssssss.',
    '...ssssssss...',
  ], keys: { y: '#ffd84a', r: '#e8433a', s: '#e6f2ff' } },
  pancake: { rows: [
    '......WW......',
    '.....WrWW.....',
    '...ttttttt....',
    '..tTTTTTTTt...',
    '..ttttttttt...',
    '..tTTTTTTTt...',
    '..ttttttttt...',
    '..tTTTTTTTt...',
    '..ttttttttt...',
    'sssssssssssss.',
    '.sssssssssss..',
  ], keys: { t: '#e5a75c', T: '#fbe3b0', W: '#fffaf2', r: '#ff5a7a', s: '#e6f2ff' } },
  matcha: { rows: [
    '....W.W.......',
    '.....W.W......',
    '..............',
    '.mmmmmmmmm....',
    '.mWmmmmmmmccc.',
    '.cccccccccc.c.',
    '.cmmmmmmmmc.c.',
    '.cmmmmmmmmccc.',
    '.cmmmmmmmmc...',
    '..cccccccc....',
  ], keys: { m: '#9ccf5c', c: '#f2efe8', W: '#ffffff' } },
  bubbletea: { rows: [
    '.......p......',
    '.......p......',
    '...ssssps.....',
    '..ccccccccc...',
    '..cttttttttc..',
    '..cttttttttc..',
    '...cttttttc...',
    '...cxtxtxtc...',
    '...cxxtxxtc...',
    '....cccccc....',
  ], keys: { s: '#ff8fb5', c: '#e8f6ff', t: '#e8c9a0', p: '#ff6fa0' } },
  greentea: { rows: [
    '...W.W....',
    '....W.W...',
    '..........',
    'GGGGGGGGGG',
    'gggggggggg',
    'gGgggggggg',
    'gggGGGgggg',
    '.gggggggg.',
    '..gggggg..',
  ], keys: { g: '#8fc46a', G: '#5f9a4a' } },
};

// Map food ids to icons (custom foods use the bowl).
export function foodIcon(id) {
  return ICONS[id] ? id : 'bowl';
}

const cache = new Map();

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Render an icon to a canvas at 1px per pixel, adding a 1px ink outline.
export function iconCanvas(name, { outline = INK, tint = null, darkOnly = false } = {}) {
  const def = ICONS[name] || ICONS.bowl;
  const rows = def.rows;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  if (def.noOutline) outline = null;
  const pad = outline ? 1 : 0;
  const cw = w + pad * 2, ch = h + pad * 2;
  const cvs = document.createElement('canvas');
  cvs.width = cw; cvs.height = ch;
  const ctx = cvs.getContext('2d');
  const img = ctx.createImageData(cw, ch);
  const filled = new Uint8Array(cw * ch);
  const keys = { ...KEYS, ...(def.keys || {}) };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < rows[y].length; x++) {
      const ch0 = rows[y][x];
      if (ch0 === '.' || ch0 === ' ') continue;
      let col = keys[ch0] || '#ff00ff';
      if (tint) {
        // Tinted glyphs (stamps) keep only the darker pixels so patterns survive.
        const [r0, g0, b0] = hexToRgb(col);
        if (darkOnly && (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255 > 0.9) continue;
        col = tint;
      }
      const [r, g, b] = hexToRgb(col);
      const i = ((y + pad) * cw + (x + pad)) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      filled[(y + pad) * cw + (x + pad)] = 1;
    }
  if (outline) {
    const [r, g, b] = hexToRgb(outline);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        if (filled[y * cw + x]) continue;
        const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < cw && yy < ch && filled[yy * cw + xx];
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) {
          const i = (y * cw + x) * 4;
          img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
        }
      }
  }
  ctx.putImageData(img, 0, 0);
  return cvs;
}

export function iconURL(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, iconCanvas(name, opts).toDataURL());
  return cache.get(key);
}

// <img> markup for an icon. size = CSS px height.
export function icon(name, size = 20, opts = {}) {
  const c = iconCanvas(name, opts);
  const scale = size / c.height;
  return `<img class="px" src="${iconURL(name, opts)}" width="${Math.round(c.width * scale)}" height="${size}" alt="" draggable="false">`;
}

// ---------------------------------------------------------------------------
// 9-slice frames → CSS custom properties

// Build a chunky button sprite (12 × 13) from a base colour.
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = (v) => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function spriteURL(rows, keys, scale = 4) {
  const h = rows.length, w = rows[0].length;
  const cvs = document.createElement('canvas');
  cvs.width = w * scale; cvs.height = h * scale;
  const ctx = cvs.getContext('2d');
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '.') continue;
      ctx.fillStyle = keys[c];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  return cvs.toDataURL();
}

const BUTTON_ROWS = [
  '..kkkkkkkk..',
  '.kllllllllk.',
  'klbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kddddddddddk',
  'kddddddddddk',
  '.kddddddddk.',
  '..kkkkkkkk..',
];
const BUTTON_DOWN_ROWS = [
  '............',
  '..kkkkkkkk..',
  '.kbbbbbbbbk.',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kddddddddddk',
  '.kddddddddk.',
  '..kkkkkkkk..',
];

export const BUTTON_COLORS = {
  pink: '#ff7fae', green: '#78c95c', blue: '#4fa8ff', sky: '#66d0e8', gold: '#ffc83d',
  orange: '#ff9a3d', red: '#ee4b4b', purple: '#9b7bff', gray: '#8f8aa3', cream: '#fff1d6', ink: '#3b3158',
};

const PANEL_ROWS = [
  '..kkkkkkkkkk..',
  '.kooooooooook.',
  'koowwwwwwwwook',
  'kowppppppppwok',
  'kowpbbbbbbpwok',
  'kowpbbbbbbpwok',
  'kowpbbbbbbpwok',
  'kowpbbbbbbpwok',
  'kowppppppppwok',
  'koowwwwwwwwook',
  'kSoooooooooSok',
  '.kSSSSSSSSSSk.',
  '..kkkkkkkkkk..',
];

const DARK_PANEL_ROWS = [
  '..kkkkkkkk..',
  '.kllllllllk.',
  'klbbbbbbbbdk',
  'klbbbbbbbbdk',
  'klbbbbbbbbdk',
  'klbbbbbbbbdk',
  'klbbbbbbbbdk',
  'klbbbbbbbbdk',
  'kddddddddddk',
  '.kddddddddk.',
  '..kkkkkkkk..',
];

const TRACK_ROWS = [
  '.kkkkkkkk.',
  'kddddddddk',
  'kdbbbbbbdk',
  'kdbbbbbbdk',
  'kdbbbbbbdk',
  'kdbbbbbbdk',
  'kllllllllk',
  '.kkkkkkkk.',
];

export function installSprites(root = document.documentElement) {
  const st = root.style;
  for (const [name, base] of Object.entries(BUTTON_COLORS)) {
    const keys = { k: INK, l: shade(base, 1.45), b: base, d: shade(base, 0.72) };
    st.setProperty(`--btn-${name}`, `url(${spriteURL(BUTTON_ROWS, keys)})`);
    st.setProperty(`--btn-${name}-down`, `url(${spriteURL(BUTTON_DOWN_ROWS, keys)})`);
  }
  st.setProperty('--panel-paper', `url(${spriteURL(PANEL_ROWS, { k: INK, o: '#c98a5a', w: '#ffe7c2', p: '#f0cfa2', b: '#fff6e6', S: '#a86a45' })})`);
  st.setProperty('--panel-sakura', `url(${spriteURL(PANEL_ROWS, { k: INK, o: '#ff8fb5', w: '#ffd6e5', p: '#ffc2d8', b: '#fff6fa', S: '#d9577f' })})`);
  st.setProperty('--panel-dark', `url(${spriteURL(DARK_PANEL_ROWS, { k: '#181430', l: '#4b4278', b: '#2e2752', d: '#211b3d' })})`);
  st.setProperty('--panel-light', `url(${spriteURL(DARK_PANEL_ROWS, { k: INK, l: '#ffffff', b: '#fffaf2', d: '#e3d8c8' })})`);
  st.setProperty('--track', `url(${spriteURL(TRACK_ROWS, { k: INK, d: '#1a1530', b: '#2e2752', l: '#4b4278' })})`);
}

// ---------------------------------------------------------------------------
// Eki-style rubber stamps for the stamp book (rendered once per landmark).

export function stampURL(lm, dateLabel, size = 160) {
  const key = `stamp:${lm.id}:${dateLabel}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d');
  const c = size / 2;
  ctx.translate(c, c);
  ctx.rotate(((lm.id.length % 5) - 2) * 0.05);
  ctx.strokeStyle = lm.ink;
  ctx.fillStyle = lm.ink;
  ctx.lineWidth = size * 0.045;
  ctx.beginPath(); ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = size * 0.018;
  ctx.beginPath(); ctx.arc(0, 0, size * 0.37, 0, Math.PI * 2); ctx.stroke();
  // Glyph
  const g = iconCanvas(lm.icon, { outline: null, tint: lm.ink, darkOnly: true });
  const gs = Math.floor((size * 0.34) / g.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(g, -g.width * gs / 2, -size * 0.27, g.width * gs, g.height * gs);
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(size * 0.15)}px "DotGothic16", monospace`;
  const jp = lm.jp.length > 4 ? lm.jp.slice(0, 5) : lm.jp;
  ctx.font = `${Math.round(size * (lm.jp.length > 4 ? 0.11 : 0.15))}px "DotGothic16", monospace`;
  ctx.fillText(jp, 0, size * 0.2);
  ctx.font = `${Math.round(size * 0.075)}px "Pixelify Sans", monospace`;
  ctx.fillText(dateLabel, 0, size * 0.32);
  // Ink texture: knock out speckles.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  let seed = lm.id.charCodeAt(0) * 97;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * 3; i++) {
    ctx.globalAlpha = 0.3 + rnd() * 0.5;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const url = cvs.toDataURL();
  cache.set(key, url);
  return url;
}
