export const SHIP_MAP = {
  width: 1920,
  height: 1120,
  spawn: { x: 960, y: 550 },
  rooms: [
    { id: 'main_deck', name: 'Pont principal', x: 620, y: 390, w: 680, h: 260, color: '#4a2d18', light: '#f6b34b', sound: 'bois + vagues' },
    { id: 'captain', name: 'Quartier capitaine', x: 1340, y: 360, w: 280, h: 210, color: '#301b14', light: '#ffd391', sound: 'plume + cartes' },
    { id: 'map_room', name: 'Salle cartes', x: 1240, y: 610, w: 300, h: 190, color: '#233146', light: '#6fb7ff', sound: 'compas' },
    { id: 'kitchen', name: 'Cuisine', x: 370, y: 610, w: 300, h: 210, color: '#3b2218', light: '#ff9c5a', sound: 'marmites' },
    { id: 'food', name: 'Reserve nourriture', x: 250, y: 390, w: 260, h: 180, color: '#2d2415', light: '#c9a66b', sound: 'caisses' },
    { id: 'cannons', name: 'Canons', x: 560, y: 730, w: 520, h: 170, color: '#1d2530', light: '#e0524a', sound: 'metal' },
    { id: 'prison', name: 'Prison', x: 1170, y: 850, w: 260, h: 170, color: '#141a22', light: '#9ca3af', sound: 'chaines' },
    { id: 'infirmary', name: 'Infirmerie', x: 790, y: 170, w: 300, h: 170, color: '#183432', light: '#49d6ff', sound: 'verre' },
    { id: 'engine', name: 'Salle machine', x: 360, y: 880, w: 360, h: 170, color: '#2b1612', light: '#ff5a3d', sound: 'vapeur' },
    { id: 'lookout', name: 'Vigie', x: 890, y: 40, w: 190, h: 110, color: '#33210f', light: '#fff3c6', sound: 'vent' },
    { id: 'hold', name: 'Cale', x: 760, y: 910, w: 330, h: 150, color: '#19140f', light: '#d4a017', sound: 'eau sombre' },
    { id: 'treasure', name: 'Salle tresor', x: 1470, y: 730, w: 260, h: 170, color: '#30210b', light: '#f6b34b', sound: 'or' },
    { id: 'den_den', name: 'Den Den Mushi room', x: 820, y: 690, w: 270, h: 170, color: '#202032', light: '#ad6bff', sound: 'purupuru' },
    { id: 'arsenal', name: 'Arsenal', x: 1550, y: 520, w: 230, h: 160, color: '#231b1b', light: '#e0524a', sound: 'armes' },
    { id: 'maintenance', name: 'Maintenance', x: 155, y: 760, w: 170, h: 210, color: '#1d1f24', light: '#37b26c', sound: 'tuyaux' },
  ],
  tunnels: [
    ['maintenance', 'engine'],
    ['prison', 'treasure'],
    ['food', 'kitchen'],
    ['den_den', 'map_room'],
  ],
}

export function roomAt(map, x, y) {
  return map.rooms.find((room) => x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h) || null
}
