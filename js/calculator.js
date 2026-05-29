/**
 * Pricing Calculator - Precision Margin Engine
 */

/**
 * Calculates pricing metrics based on raw input parameters.
 * 
 * @param {number} exwPrice - EXW Price in Yen (¥)
 * @param {number} excRate - Exchange Rate (THB/¥)
 * @param {number} quantity - Product Quantity (PCS)
 * @param {number} overseasShipping - Overseas Shipping Rate (%)
 * @param {number} domesticPacking - Domestic & Packing Rate (%)
 * @param {number} gpMargin - Target Gross Profit Margin (%)
 * @returns {Object} Calculated metrics
 */
export function calculatePricing(exwPrice, excRate, quantity, overseasShipping, domesticPacking, gpMargin) {
    const exw = parseFloat(exwPrice) || 0;
    const exc = parseFloat(excRate) || 0;
    const qty = parseFloat(quantity) || 0;
    const shipPer = parseFloat(overseasShipping) || 0;
    const domPer = parseFloat(domesticPacking) || 0;
    const gpPer = parseFloat(gpMargin) || 0;

    // 1. Base Price (ราคารวมต้นทาง) in THB
    const basePrice = (exw * exc) * qty;

    // 2. Overseas Shipping (ค่าขนส่งรวม) in THB
    const totalSeaShip = basePrice * (shipPer / 100);

    // 3. Domestic & Packing (ค่าดำเนินการรวม) in THB
    const totalDomestic = (basePrice + totalSeaShip) * (domPer / 100);

    // 4. Total Cost (ต้นทุนรวมทั้งหมด) in THB
    const totalCost = basePrice + totalSeaShip + totalDomestic;

    // 5. Price Per Unit (ราคาขายต่อชิ้น) in THB
    // Formula: unit = (cost / qty) / (1 - (gpMargin / 100))
    const pricePerUnit = qty > 0 ? (totalCost / qty) / (1 - (gpPer / 100)) : 0;

    // 6. Profit Per Unit (กำไรต่อชิ้น) in THB
    const profitPerUnit = qty > 0 ? pricePerUnit - (totalCost / qty) : 0;

    // 7. Total Profit (กำไรรวม) in THB
    const totalProfit = profitPerUnit * qty;

    return {
        basePrice: Math.round(basePrice * 100) / 100,
        totalSeaShip: Math.round(totalSeaShip * 100) / 100,
        totalDomestic: Math.round(totalDomestic * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        pricePerUnit: Math.round(pricePerUnit * 100) / 100,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100
    };
}
