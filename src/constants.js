export const PASSPORT_SIZES = {
  US: { id: 'US', name: 'US / India (2" x 2")', width: 51, height: 51, aspect: 1, label: '2 x 2 in (51 x 51 mm)' },
  EU: { id: 'EU', name: 'UK / Europe (35 x 45 mm)', width: 35, height: 45, aspect: 35 / 45, label: '35 x 45 mm' },
  CA: { id: 'CA', name: 'Canada (50 x 70 mm)', width: 50, height: 70, aspect: 50 / 70, label: '50 x 70 mm' },
  CN: { id: 'CN', name: 'China (33 x 48 mm)', width: 33, height: 48, aspect: 33 / 48, label: '33 x 48 mm' },
  VISA: { id: 'VISA', name: 'Visa Size (2" x 2")', width: 51, height: 51, aspect: 1, label: '2 x 2 in' },
  CUSTOM: { id: 'CUSTOM', name: 'Custom Size', width: 35, height: 45, aspect: 35 / 45, label: 'Custom' },
};

export const SHEET_SIZES = {
  PHOTO_4X6: { id: 'PHOTO_4X6', name: '4" x 6" Photo Paper', width: 101.6, height: 152.4, unit: 'in', displayWidth: 4, displayHeight: 6 }
};
