# Production System Implementation Guide

## Overview

The StockFlow Production System is a comprehensive bakery management solution that handles the complete production workflow from recipe creation to finished product inventory. This system transforms raw materials into finished goods while tracking costs, quality, and profitability at every stage.

## System Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Recipe        │───▶│  Production      │───▶│  Finished       │
│   Management    │    │  Batch System    │    │  Products       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Raw Materials │    │  Cost Tracking   │    │  Inventory      │
│   Management    │    │  & Analytics     │    │  Integration    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Detailed System Components

### 1. Recipe Management System

**Location**: `/dashboard/production/recipes`
**Files**:
- `app/(dashboard)/dashboard/production/recipes/page.tsx`
- `components/production/RecipeManagement.tsx`

#### Features

**Recipe Creation & Management**:
- Multi-step recipe builder with basic info, ingredients, instructions, and cost analysis
- Support for different recipe categories (Bread, Pastry, Cake, etc.)
- Difficulty levels (Easy, Medium, Hard, Expert)
- Recipe versioning and status management (Draft, Active, Archived, Under Review)

**Cost Calculation Engine**:
```typescript
// Automatic cost calculation formula
const totalMaterialCost = ingredients.reduce((sum, ingredient) => {
  return sum + (ingredient.quantity * ingredient.rawMaterial.costPrice)
}, 0)

const laborCost = (preparationTime + cookingTime) / 60 * HOURLY_RATE
const overheadCost = (totalMaterialCost + laborCost) * 0.1
const totalCost = totalMaterialCost + laborCost + overheadCost
const costPerUnit = totalCost / yields
const suggestedPrice = costPerUnit / (1 - (targetMarginPercentage / 100))
```

**Ingredient Management**:
- Link to raw materials from inventory
- Quantity and unit of measure tracking
- Optional ingredients support
- Real-time cost updates when material prices change

**Recipe Analytics**:
- Profit margin calculations
- Cost breakdown analysis
- Recipe performance tracking
- Production batch history

#### How It Works

1. **Recipe Creation**:
   - Chef creates recipe with basic information
   - Adds ingredients with quantities and units
   - Writes step-by-step instructions
   - System calculates costs automatically

2. **Cost Analysis**:
   - Material costs calculated from current inventory prices
   - Labor costs estimated based on preparation and cooking time
   - Overhead allocated as percentage of direct costs
   - Suggested selling price calculated based on target margin

3. **Recipe Approval**:
   - Draft recipes reviewed and tested
   - Status changed to Active when ready for production
   - Version control for recipe modifications

### 2. Production Batch System

**Location**: `/dashboard/production/batches`
**Files**:
- `app/(dashboard)/dashboard/production/batches/page.tsx`
- `components/production/ProductionBatchManagement.tsx`
- `components/production/CreateBatchDialog.tsx`
- `components/production/BatchDetailsDialog.tsx`

#### Production Workflow

```
PLANNED ──▶ IN_PROGRESS ──▶ QUALITY_CHECK ──▶ COMPLETED
   │              │               │              │
   ▼              ▼               ▼              ▼
Reserve      Consume        Check Quality   Add to
Materials    Materials      & Score         Inventory
```

#### Features

**Batch Planning**:
- Select recipe and quantity to produce
- Automatic scaling of ingredient requirements
- Resource availability checking
- Schedule planning with start/end times
- Priority assignment (High, Medium, Low)

**Production Execution**:
- Start production process
- Real-time status tracking
- Material consumption recording
- Progress monitoring

**Quality Control**:
- Quality scoring system (1-10 scale)
- Quality grade assignment (A, B, C, REJECT)
- Quality check notes and approval
- Batch completion validation

#### Batch Lifecycle

1. **Planning Phase** (Status: PLANNED):
   ```typescript
   // Reserve raw materials
   await reserveMaterials(batchId, ingredients, scalingFactor)

   // Update inventory levels
   await updateInventoryReservations(materials, quantities)
   ```

2. **Production Phase** (Status: IN_PROGRESS):
   ```typescript
   // Start production
   await startProductionBatch(batchId, userId)

   // Convert reservations to consumption
   await consumeRawMaterials(batchId, materials)
   ```

3. **Quality Check Phase** (Status: QUALITY_CHECK):
   ```typescript
   // Quality assessment
   const qualityData = {
     quantityProduced,
     qualityScore,
     notes
   }
   ```

4. **Completion Phase** (Status: COMPLETED):
   ```typescript
   // Create finished products
   await createFinishedProducts(batchId, quantity, cost)

   // Add to inventory
   await addToInventory(finishedProduct, location)
   ```

### 3. Raw Materials Management

**Location**: `/dashboard/production/raw-materials`
**Files**:
- `app/(dashboard)/dashboard/production/raw-materials/page.tsx`
- `components/production/RawMaterialsManagement.tsx`

#### Features

**Smart Material Classification**:
- Automatic detection of raw materials based on category keywords
- Classification of items suitable for production (ingredients, flour, sugar, etc.)
- Integration with existing inventory system

**Stock Management**:
```typescript
// Stock status calculation
const getStockStatus = (item) => {
  const totalStock = item.inventoryLevels.reduce(
    (sum, level) => sum + level.quantityOnHand, 0
  )

  if (totalStock === 0) return 'OUT_OF_STOCK'
  if (totalStock <= item.minStockLevel) return 'LOW_STOCK'
  if (totalStock >= item.maxStockLevel) return 'OVERSTOCK'
  return 'IN_STOCK'
}
```

**Cost Tracking**:
- Real-time material cost monitoring
- Total inventory value calculation
- Cost per unit tracking
- Supplier price management

**Reorder Management**:
- Automatic low stock alerts
- Reorder point monitoring
- Purchase order generation
- Supplier integration

#### How It Works

1. **Material Classification**:
   - System scans inventory for items with keywords like "ingredient", "flour", "sugar"
   - Categorizes items as raw materials vs. finished products
   - Links materials to recipes and production batches

2. **Usage Tracking**:
   - Monitors material consumption in production batches
   - Tracks usage patterns and forecasting
   - Identifies fast/slow-moving materials

3. **Cost Management**:
   - Updates recipe costs when material prices change
   - Tracks cost variance over time
   - Provides cost optimization recommendations

### 4. Database Schema

The production system uses the following Prisma models:

```prisma
model Recipe {
  id                      String    @id @default(uuid())
  name                    String
  description             String?
  category                String
  status                  RecipeStatus
  version                 Int       @default(1)
  yields                  Int
  yieldUnit               UnitOfMeasure
  totalCost               Float
  costPerUnit             Float
  suggestedSellingPrice   Float

  // Relationships
  ingredients            RecipeIngredient[]
  instructions           RecipeInstruction[]
  productionBatches      ProductionBatch[]
}

model ProductionBatch {
  id                  String           @id @default(uuid())
  batchNumber         String           @unique
  status              ProductionStatus
  quantityPlanned     Int
  quantityProduced    Int             @default(0)
  yieldPercentage     Float           @default(0)
  totalCost           Float
  costPerUnit         Float
  qualityScore        Float?

  // Relationships
  recipe              Recipe           @relation(fields: [recipeId], references: [id])
  rawMaterialUsage    RawMaterialUsage[]
  finishedProducts    FinishedProduct[]
}

model RawMaterialUsage {
  id                  String @id @default(uuid())
  quantityUsed        Float
  unitCost            Float
  totalCost           Float

  // Relationships
  productionBatch     ProductionBatch @relation(fields: [productionBatchId], references: [id])
  rawMaterial         Item            @relation(fields: [rawMaterialId], references: [id])
}

model FinishedProduct {
  id                  String @id @default(uuid())
  quantityProduced    Int
  unitCost            Float
  totalCost           Float
  qualityGrade        String
  batchCode           String

  // Relationships
  productionBatch     ProductionBatch @relation(fields: [productionBatchId], references: [id])
  item                Item            @relation(fields: [itemId], references: [id])
}
```

## Integration Points

### 1. Inventory System Integration

**Raw Material Consumption**:
```typescript
// When production starts
const consumeMaterials = async (batchId, ingredients) => {
  for (const ingredient of ingredients) {
    // Update inventory levels
    await updateInventoryLevel({
      itemId: ingredient.rawMaterialId,
      quantityOnHand: { decrement: ingredient.quantity },
      quantityReserved: { decrement: ingredient.quantity }
    })

    // Create transaction record
    await createInventoryTransaction({
      type: 'CONSUMPTION',
      quantity: -ingredient.quantity,
      itemId: ingredient.rawMaterialId,
      referenceType: 'PRODUCTION',
      referenceId: batchId
    })
  }
}
```

**Finished Product Addition**:
```typescript
// When production completes
const addFinishedProduct = async (batchId, quantity, cost) => {
  // Create or update item record
  const finishedItem = await ensureFinishedProductExists(recipe)

  // Add to inventory
  await updateInventoryLevel({
    itemId: finishedItem.id,
    quantityOnHand: { increment: quantity },
    quantityAvailable: { increment: quantity }
  })

  // Create transaction record
  await createInventoryTransaction({
    type: 'PRODUCTION',
    quantity: quantity,
    itemId: finishedItem.id,
    referenceType: 'PRODUCTION',
    referenceId: batchId
  })
}
```

### 2. Cost Management Integration

**Real-time Cost Updates**:
- Recipe costs automatically update when raw material prices change
- Production batches use current costs at time of creation
- Historical cost tracking for profitability analysis

**Profitability Analysis**:
```typescript
const calculateProfitability = (batch) => {
  const revenue = batch.finishedProducts.reduce((sum, product) =>
    sum + (product.quantityProduced * product.item.sellingPrice), 0
  )

  const profit = revenue - batch.totalCost
  const margin = (profit / revenue) * 100

  return { revenue, profit, margin }
}
```

### 3. Notification System Integration

All production system components use the NotificationProvider for consistent messaging:

```typescript
// Success notifications
notifications.success('Batch Started', 'Production batch started successfully')

// Error handling
notifications.error('Creation Failed', result.error || 'Failed to create recipe')

// Progress updates
notifications.info('Processing', 'Updating recipe costs...')

// Validation errors
notifications.formError('Recipe Creation', 'Recipe name is required', 'Please enter a recipe name')
```

## Usage Workflows

### 1. Creating a New Recipe

1. Navigate to `/dashboard/production/recipes`
2. Click "Create Recipe"
3. Fill in basic information (name, category, serving size, yields)
4. Add ingredients with quantities and units
5. Write step-by-step instructions
6. Review cost analysis and adjust target margin
7. Save as draft for testing or activate for production

### 2. Planning Production Batch

1. Navigate to `/dashboard/production/batches`
2. Click "Create Batch"
3. Select recipe and quantity to produce
4. Set priority and schedule
5. Review cost estimation and expected profit
6. Create batch (materials are automatically reserved)

### 3. Executing Production

1. View batch details from batches list
2. Click "Start Production" when ready
3. System consumes reserved materials
4. Monitor progress and update status as needed
5. Complete batch with actual quantity and quality score
6. Finished products automatically added to inventory

### 4. Managing Raw Materials

1. Navigate to `/dashboard/production/raw-materials`
2. Monitor stock levels and alerts
3. Generate purchase orders for low stock items
4. Update costs when new materials arrive
5. System automatically updates all affected recipe costs

## Performance Metrics

The system tracks various performance indicators:

### Production Metrics
- **Total Batches**: Number of production batches created
- **Active Batches**: Batches currently in production
- **Completion Rate**: Percentage of batches completed successfully
- **Average Yield**: Average yield percentage across all batches
- **Quality Score**: Average quality score across completed batches

### Financial Metrics
- **Total Production Cost**: Sum of all production costs
- **Average Cost per Unit**: Average cost across all products
- **Gross Profit**: Total revenue minus total costs
- **Gross Margin**: Profit percentage
- **Cost Variance**: Difference between estimated and actual costs

### Efficiency Metrics
- **Production Time**: Average time to complete batches
- **Material Utilization**: Percentage of materials used efficiently
- **Capacity Utilization**: Percentage of production capacity used
- **Waste Percentage**: Amount of materials wasted

## Security and Permissions

The production system respects the application's role-based access control:

- **PRODUCTION_READ**: View production data
- **PRODUCTION_WRITE**: Create and modify production batches
- **RECIPE_READ**: View recipes
- **RECIPE_WRITE**: Create and modify recipes
- **RECIPE_DELETE**: Delete recipes
- **PRODUCTION_ANALYTICS**: Access to production reports and analytics

## Future Enhancements

### Planned Features
1. **Advanced Scheduling**: Gantt charts and capacity planning
2. **Equipment Management**: Track equipment usage and maintenance
3. **Waste Tracking**: Detailed waste analysis and reduction
4. **Nutritional Information**: Calculate nutritional data for products
5. **Barcode Integration**: Scan materials and products
6. **Mobile App**: Production tracking on mobile devices
7. **API Integration**: Connect with external bakery equipment
8. **Advanced Analytics**: Machine learning for demand forecasting

### Potential Integrations
1. **POS System**: Direct integration with sales data
2. **Supplier APIs**: Automated price updates and ordering
3. **Equipment IoT**: Real-time equipment monitoring
4. **Quality Sensors**: Automated quality measurements
5. **Weather APIs**: Adjust recipes based on humidity/temperature
6. **Accounting Systems**: Financial reporting integration

## Troubleshooting

### Common Issues

**1. Recipe Cost Calculation Issues**
- Ensure all raw materials have valid cost prices
- Check ingredient quantities and units
- Verify labor rate and overhead percentage settings

**2. Batch Creation Failures**
- Confirm sufficient raw material inventory
- Check recipe status (must be ACTIVE)
- Verify location and user permissions

**3. Inventory Sync Issues**
- Ensure proper transaction recording
- Check for failed batch completions
- Verify inventory level calculations

**4. Performance Issues**
- Monitor database query performance
- Check for proper indexing on production tables
- Optimize filters and search queries

## Support and Maintenance

### Regular Maintenance Tasks
1. **Cost Updates**: Regularly update raw material costs
2. **Recipe Reviews**: Quarterly recipe cost and margin reviews
3. **Data Cleanup**: Archive old batches and recipes
4. **Performance Monitoring**: Monitor system performance metrics
5. **User Training**: Regular training on new features

### Backup and Recovery
- Production data is critical and backed up daily
- Recipe formulations are versioned and archived
- Production batches maintain complete audit trails
- Cost history preserved for financial analysis

## Conclusion

The StockFlow Production System provides a comprehensive solution for bakery production management, from recipe creation to finished product delivery. The system ensures accurate cost tracking, quality control, and seamless integration with inventory management while maintaining detailed analytics for business optimization.

The modular design allows for easy extension and customization based on specific bakery needs, while the robust database schema ensures data integrity and performance at scale.