export const onePieceRegions = ['Tous', 'East Blue', 'West Blue', 'North Blue', 'South Blue', 'Grand Line', 'Red Line', 'Nouveau Monde', 'Calm Belt']

const island = (name, region, x, y, arc, status = 'connu', spoilerLevel = 1, characters = [], crews = []) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
  name, region, x, y, arc, status, spoilerLevel, characters, crews,
})

export const onePieceIslands = [
  island('Fuchsia', 'East Blue', 10, 62, 'Romance Dawn', 'connu', 1, ['Luffy'], ['Mugiwara']),
  island('Shells Town', 'East Blue', 17, 54, 'Romance Dawn', 'connu', 1, ['Zoro']),
  island('Baratie', 'East Blue', 24, 62, 'Baratie', 'connu', 1, ['Sanji']),
  island('Arlong Park', 'East Blue', 31, 55, 'Arlong Park', 'dangereux', 1, ['Nami']),
  island('Loguetown', 'East Blue', 38, 47, 'Loguetown', 'connu', 1, ['Smoker']),
  island('Reverse Mountain', 'Red Line', 44, 50, 'Reverse Mountain', 'dangereux', 1, ['Laboon']),
  island('Drum', 'Grand Line', 50, 40, 'Drum Island', 'connu', 1, ['Chopper']),
  island('Alabasta', 'Grand Line', 55, 58, 'Alabasta', 'dangereux', 1, ['Vivi', 'Crocodile']),
  island('Skypiea', 'Grand Line', 58, 26, 'Skypiea', 'secret', 2, ['Enel']),
  island('Water Seven', 'Grand Line', 63, 48, 'Water Seven', 'connu', 2, ['Franky']),
  island('Enies Lobby', 'Grand Line', 67, 44, 'Enies Lobby', 'interdit', 3, ['CP9']),
  island('Thriller Bark', 'Calm Belt', 68, 66, 'Thriller Bark', 'dangereux', 2, ['Moria']),
  island('Sabaody', 'Grand Line', 72, 52, 'Sabaody', 'dangereux', 2, ['Rayleigh']),
  island('Impel Down', 'Calm Belt', 74, 70, 'Impel Down', 'interdit', 3, ['Magellan']),
  island('Marineford', 'Grand Line', 77, 48, 'Marineford', 'interdit', 4, ['Ace', 'Whitebeard']),
  island('Fishman Island', 'Red Line', 80, 58, 'Fishman Island', 'connu', 2, ['Jinbei']),
  island('Punk Hazard', 'Nouveau Monde', 84, 42, 'Punk Hazard', 'dangereux', 3, ['Law']),
  island('Dressrosa', 'Nouveau Monde', 88, 54, 'Dressrosa', 'dangereux', 3, ['Doflamingo']),
  island('Whole Cake Island', 'Nouveau Monde', 90, 34, 'Whole Cake Island', 'dangereux', 3, ['Big Mom']),
  island('Wano', 'Nouveau Monde', 94, 47, 'Wano', 'secret', 4, ['Kaido', 'Oden']),
  island('Egghead', 'Nouveau Monde', 96, 30, 'Egghead', 'interdit', 5, ['Vegapunk']),
  island('Elbaf', 'Nouveau Monde', 98, 18, 'Elbaf', 'secret', 5, ['Geants']),
]
