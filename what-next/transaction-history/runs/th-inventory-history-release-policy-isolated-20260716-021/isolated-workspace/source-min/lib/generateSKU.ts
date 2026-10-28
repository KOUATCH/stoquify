export const  generateStructuredSKU=(
  brand: string,
  category: string,
  variant: string | null = null
) =>{
    const brandCode = brand.substring(0, 3).toUpperCase();
    const categoryCode = category.substring(0, 3).toUpperCase();
    // const subcategoryCode = subcategory.substring(0, 3).toUpperCase();
    
    // Generate a 4-digit random number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    let sku = `${brandCode}-${randomNum}-${categoryCode}`;
    // let sku = `${brandCode}-${categoryCode}-${randomNum}`;
    // let sku = `${brandCode}-${categoryCode}-${subcategoryCode}-${randomNum}`;
    
    // Add variant if provided
    if (variant) {
      const variantCode = variant.substring(0, 2).toUpperCase();
      sku += `-${variantCode}`;
    }
    
    return sku;
  }
  // SKU Generator with uniqueness tracking
// class SKUGenerator {
//   constructor() {
//     this.usedSKUs = new Set();
//   }

//   // Generate a random alphanumeric SKU
//  const  generateSKU=(length = 8, prefix = '')=> {
//     const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
//     let attempts = 0;
//     const maxAttempts = 1000;
    
//     while (attempts < maxAttempts) {
//       let sku = prefix;
      
//       // Generate random characters
//       for (let i = 0; i < length; i++) {
//         sku += chars.charAt(Math.floor(Math.random() * chars.length));
//       }
      
//       // Check if SKU is unique
//       if (!this.usedSKUs.has(sku)) {
//         this.usedSKUs.add(sku);
//         return sku;
//       }
      
//       attempts++;
//     }
    
//     // If we can't generate a unique SKU, throw an error
//     throw new Error('Unable to generate unique SKU after maximum attempts');
//   }

//   // Alternative method with timestamp for extra uniqueness
//  const  generateTimestampSKU=(prefix = 'SKU')=> {
//     const timestamp = Date.now().toString(36).toUpperCase();
//     const random = Math.random().toString(36).substring(2, 6).toUpperCase();
//     const sku = `${prefix}-${timestamp}-${random}`;
    
//     // this.usedSKUs.add(sku);
//     return sku;
//   }

//   // Check if a SKU already exists
//   isSKUUsed(sku) {
//     return this.usedSKUs.has(sku);
//   }

//   // Manually add existing SKUs to the tracker
//   addExistingSKU(sku) {
//     this.usedSKUs.add(sku);
//   }

//   // Get count of generated SKUs
//   getGeneratedCount() {
//     return this.usedSKUs.size;
//   }

//   // Clear all tracked SKUs (use with caution)
//   clearTracking() {
//     this.usedSKUs.clear();
//   }
// }

// Usage examples:
// const skuGen = new SKUGenerator();

// // Basic usage - generates 8-character alphanumeric SKU
// console.log('Basic SKU:', skuGen.generateSKU());

// // Custom length
// console.log('10-char SKU:', skuGen.generateSKU(10));

// // With prefix
// console.log('Prefixed SKU:', skuGen.generateSKU(6, 'PROD-'));

// // Timestamp-based SKU (guaranteed unique)
// console.log('Timestamp SKU:', skuGen.generateTimestampSKU());
// console.log('Custom prefix timestamp:', skuGen.generateTimestampSKU('ITEM'));

// // Check uniqueness
// console.log('Generated count:', skuGen.getGeneratedCount());

// Simple function version (if you don't need tracking)
export const generateSimpleSKU = (length: number, prefix: string = '') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}