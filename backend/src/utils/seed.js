const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding Villa Vogue BMS database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('VillaVogue@2024!', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'kayanjawilfred@gmail.com',
      phone: '+256782860372',
      password: adminPassword,
      role: 'admin',
      twoFaEnabled: true,
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // Create manager
  const managerPassword = await bcrypt.hash('Manager@2024!', 12);
  await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      email: 'manager@villavogue.com',
      password: managerPassword,
      role: 'manager',
    },
  });

  // Create staff
  const staffPassword = await bcrypt.hash('Staff@2024!', 12);
  await prisma.user.upsert({
    where: { username: 'staff1' },
    update: {},
    create: { username: 'staff1', password: staffPassword, role: 'staff' },
  });

  // Create categories
  const categories = ['Dresses', 'Tops', 'Trousers', 'Skirts', 'Suits', 'Accessories', 'Shoes', 'Bags', 'Outerwear', 'Lingerie'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, color: '#C9A96E' },
    });
  }
  console.log('✅ Categories created');

  // Default settings
  const defaultSettings = [
    ['business_name', 'Villa Vogue Fashions'],
    ['business_email', 'villavoguef@gmail.com'],
    ['business_phone', '+256 782 860372'],
    ['business_address', 'Kampala, Uganda'],
    ['currency', 'UGX'],
    ['currency_symbol', 'UGX'],
    ['tax_rate', '0'],
    ['low_stock_threshold', '5'],
    ['loyalty_rate', '1000'],
    ['receipt_footer', 'Thank you for shopping at Villa Vogue! Where Fashion Finds a Home.'],
  ];

  for (const [key, value] of defaultSettings) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log('✅ Default settings created');

  // Sample products
  const products = [
    { name: 'Floral Wrap Dress', price: 85000, costPrice: 45000, stock: 12, category: 'Dresses' },
    { name: 'Silk Blouse White', price: 55000, costPrice: 28000, stock: 8, category: 'Tops' },
    { name: 'High-Waist Trousers', price: 75000, costPrice: 38000, stock: 15, category: 'Trousers' },
    { name: 'Midi Skirt Black', price: 65000, costPrice: 32000, stock: 6, category: 'Skirts' },
    { name: 'Gold Hoop Earrings', price: 25000, costPrice: 10000, stock: 20, category: 'Accessories' },
    { name: 'Leather Handbag', price: 120000, costPrice: 65000, stock: 5, category: 'Bags' },
    { name: 'Block Heel Sandals', price: 95000, costPrice: 50000, stock: 10, category: 'Shoes' },
    { name: 'Blazer Camel', price: 180000, costPrice: 95000, stock: 4, category: 'Suits' },
  ];

  for (const p of products) {
    const cat = await prisma.category.findFirst({ where: { name: p.category } });
    if (cat) {
      await prisma.product.create({
        data: { name: p.name, sku: `VV-${Math.random().toString(36).substring(2,7).toUpperCase()}`, price: p.price, costPrice: p.costPrice, stock: p.stock, categoryId: cat.id, isFeatured: Math.random() > 0.5 }
      }).catch(() => {});
    }
  }
  console.log('✅ Sample products created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('📋 Default credentials:');
  console.log('  Admin: admin / VillaVogue@2024! (requires email 2FA)');
  console.log('  Manager: manager / Manager@2024!');
  console.log('  Staff: staff1 / Staff@2024!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());

// Ensure new tables exist and add initial data
async function seedNewTables() {
  // Create welcome notification
  try {
    await prisma.notification.upsert({
      where: { id: 1 },
      update: {},
      create: { type: 'system', title: 'Welcome to Villa Vogue BMS v2.1', message: 'AI insights, cash book, and full analytics are now active. Check the dashboard for your business summary.' }
    }).catch(() => {});
  } catch(e) {}

  console.log('✅ New tables initialized');
}

seedNewTables().catch(() => {}).finally(() => {});
