const fs = require('fs');
const path = require('path');

const categories = ['electronics', 'clothing', 'toys', 'books', 'home'];
const productNames = {
    electronics: ['Smartphone', 'Laptop', 'Headphones', 'Smart Watch', 'Camera', 'Drone', 'Tablet', 'Monitor', 'Speaker', 'Keyboard', 'Mouse'],
    clothing: ['T-Shirt', 'Jeans', 'Jacket', 'Sneakers', 'Hat', 'Dress', 'Hoodie', 'Socks', 'Scarf', 'Gloves'],
    toys: ['Action Figure', 'LEGO Set', 'Doll', 'Puzzle', 'Board Game', 'Remote Car', 'Plush Bear', 'Yo-Yo', 'Kite'],
    books: ['Novel', 'Science Book', 'History Book', 'Comic', 'Biography', 'Cookbook', 'Art Book'],
    home: ['Lamp', 'Chair', 'Pillow', 'Vase', 'Clock', 'Mug', 'Plant Pot', 'Rug', 'Mirror']
};

const adjectives = ['Pro', 'Max', 'Ultra', 'Lite', 'Super', 'Classic', 'Modern', 'Vintage', 'Premium', 'Basic', 'Limited Edition', 'Golden'];

const images = {
    electronics: 'https://images.unsplash.com/photo-1498049381145-064492c28288?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
    clothing: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
    toys: 'https://images.unsplash.com/photo-1566576912902-1d6db6b8fc54?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
    books: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
    home: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80'
};

const items = [];

for (let i = 1; i <= 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const baseName = productNames[category][Math.floor(Math.random() * productNames[category].length)];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

    items.push({
        id: i,
        name: `${adjective} ${baseName} ${Math.floor(Math.random() * 1000)}`,
        category: category,
        image: images[category],
        price: (Math.random() * 5 + 0.1).toFixed(2), // Price between 0.1 and 5.1 ETH
        rating: Math.floor(Math.random() * 5) + 1,
        stock: Math.floor(Math.random() * 50) + 10
    });
}

const outputPath = path.join(__dirname, '../src/items.json');
fs.writeFileSync(outputPath, JSON.stringify({ items }, null, 2));

console.log('Successfully generated 100 items in src/items.json');
