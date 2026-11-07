export function convertToKitchenEquipment(dbEquipment) {
    return Object.assign(Object.assign({}, dbEquipment), { lastMaintenanceDate: dbEquipment.lastMaintenanceDate || undefined, purchaseDate: dbEquipment.purchaseDate || undefined, maintenanceNotes: dbEquipment.maintenanceNotes || undefined, maintenanceInterval: dbEquipment.maintenanceInterval || undefined, purchasePrice: dbEquipment.purchasePrice || undefined });
}
