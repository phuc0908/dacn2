const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Initialize blockchain connection
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

function getContractAddress() {
    // Prefer .env, fallback to src/config.json (Hardhat local)
    if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;

    try {
        const configPath = path.join(__dirname, 'src', 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config?.["31337"]?.dappazon?.address || null;
    } catch (e) {
        return null;
    }
}

// Load contract ABI
function getContractAbi() {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'abis', 'Dappazon.json'), 'utf8'));
    return Array.isArray(raw) ? raw : raw.abi;
}

function getReadonlyContract() {
    const address = getContractAddress();
    if (!address) throw new Error('CONTRACT_ADDRESS not found (set env or src/config.json)');
    return new ethers.Contract(address, getContractAbi(), provider);
}


// Middleware
app.use(cors());
app.use(express.json());

// Function to fetch products from blockchain
async function getProductsFromBlockchain() {
    try {
        const products = {
            electronics: [],
            clothing: [],
            toys: []
        };

        const dappazonContract = getReadonlyContract();
        // Keep simple & stable: fetch base catalog size (14 items) by default
        // (Server is used for chat; product management is handled elsewhere.)
        const total = 14;

        for (let i = 1; i <= total; i++) {
            const item = await dappazonContract.items(i);
            if (item.id.toString() === '0') continue;
            const product = {
                id: item.id.toString(),
                name: item.name,
                category: item.category,
                price: ethers.utils.formatEther(item.cost),
                rating: item.rating.toString(),
                stock: item.stock.toString()
            };

            // Categorize products
            if (item.category === 'electronics') {
                products.electronics.push(product);
            } else if (item.category === 'clothing') {
                products.clothing.push(product);
            } else if (item.category === 'toys') {
                products.toys.push(product);
            }
        }

        return products;
    } catch (error) {
        console.error('Error fetching products from blockchain:', error);
        return null;
    }
}

// Function to generate dynamic system prompt
async function generateSystemPrompt() {
    const products = await getProductsFromBlockchain();

    if (!products) {
        // Fallback to static data if blockchain fetch fails
        return `Bạn là trợ lý AI thông minh cho Dappazon - một nền tảng thương mại điện tử phi tập trung (decentralized e-commerce) chạy trên blockchain Ethereum.

**Thông tin về Dappazon:**
- Dappazon là marketplace blockchain nơi người dùng mua sản phẩm bằng Ethereum (ETH)
- Tất cả giao dịch được ghi lại trên blockchain, đảm bảo minh bạch và bảo mật
- Người dùng cần ví MetaMask để kết nối và mua hàng
- Smart contract quản lý toàn bộ sản phẩm và đơn hàng

**Danh mục sản phẩm:**

📱 Electronics & Gadgets:
- Camera (1 ETH) - Đánh giá 4⭐, còn 10 sản phẩm
- Drone (2 ETH) - Đánh giá 5⭐, còn 6 sản phẩm  
- Headset (0.25 ETH) - Đánh giá 2⭐, còn 24 sản phẩm

👔 Clothing & Jewelry:
- Shoes (0.25 ETH) - Đánh giá 5⭐, còn 3 sản phẩm
- Sunglasses (0.10 ETH) - Đánh giá 4⭐, còn 12 sản phẩm
- Watch (1.25 ETH) - Đánh giá 4⭐, HẾT HÀNG

🎮 Toys & Gaming:
- Puzzle Cube (0.05 ETH) - Đánh giá 4⭐, còn 15 sản phẩm
- Train Set (0.20 ETH) - Đánh giá 4⭐, HẾT HÀNG
- Robot Set (0.15 ETH) - Đánh giá 3⭐, còn 12 sản phẩm

**Vai trò của bạn:**
- Trả lời câu hỏi về sản phẩm, giá cả, tồn kho
- Giải thích về blockchain, Ethereum, smart contracts
- Hướng dẫn cài đặt và sử dụng MetaMask
- Giúp người dùng hiểu cách mua hàng trên Dappazon
- Hỗ trợ cả tiếng Việt và tiếng Anh
- Giữ câu trả lời ngắn gọn, thân thiện, dễ hiểu

Hãy trả lời một cách tự nhiên, hữu ích và chuyên nghiệp!`;
    }

    // Format products for AI
    const formatProducts = (productList) => {
        return productList.map(p => {
            const stockText = parseInt(p.stock) === 0 ? 'HẾT HÀNG' : `còn ${p.stock} sản phẩm`;
            const stars = '⭐'.repeat(parseInt(p.rating));
            return `- ${p.name} (${p.price} ETH) - Đánh giá ${stars}, ${stockText}`;
        }).join('\n');
    };

    return `Bạn là trợ lý AI thông minh cho Dappazon - một nền tảng thương mại điện tử phi tập trung (decentralized e-commerce) chạy trên blockchain Ethereum.

**Thông tin về Dappazon:**
- Dappazon là marketplace blockchain nơi người dùng mua sản phẩm bằng Ethereum (ETH)
- Tất cả giao dịch được ghi lại trên blockchain, đảm bảo minh bạch và bảo mật
- Người dùng cần ví MetaMask để kết nối và mua hàng
- Smart contract quản lý toàn bộ sản phẩm và đơn hàng

**Danh mục sản phẩm (DỮ LIỆU THỜI GIAN THỰC TỪ BLOCKCHAIN):**

📱 Electronics & Gadgets:
${formatProducts(products.electronics)}

👔 Clothing & Jewelry:
${formatProducts(products.clothing)}

🎮 Toys & Gaming:
${formatProducts(products.toys)}

**Hướng dẫn mua hàng:**
1. Cài đặt MetaMask extension từ metamask.io
2. Tạo hoặc import ví Ethereum
3. Kết nối ví với Dappazon (nút "Connect")
4. Chọn sản phẩm muốn mua
5. Click "Buy Now" và xác nhận giao dịch trong MetaMask
6. Chờ blockchain xác nhận (vài giây)

**Vai trò của bạn:**
- Trả lời câu hỏi về sản phẩm, giá cả, tồn kho (SỬ DỤNG DỮ LIỆU THỜI GIAN THỰC Ở TRÊN)
- Giải thích về blockchain, Ethereum, smart contracts
- Hướng dẫn cài đặt và sử dụng MetaMask
- Giúp người dùng hiểu cách mua hàng trên Dappazon
- Hỗ trợ cả tiếng Việt và tiếng Anh
- Giữ câu trả lời ngắn gọn, thân thiện, dễ hiểu

Hãy trả lời một cách tự nhiên, hữu ích và chuyên nghiệp!`;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Generate system prompt with real-time data
        const SYSTEM_PROMPT = await generateSystemPrompt();

        // Build messages array for Groq
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // Call Groq API
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: 'llama-3.3-70b-versatile', // Updated to active model
            temperature: 0.7,
            max_tokens: 500,
            top_p: 1,
            stream: false
        });

        const botResponse = completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

        res.json({
            response: botResponse,
            model: completion.model,
            usage: completion.usage
        });

    } catch (error) {
        console.error('Groq API Error:', error);
        res.status(500).json({
            error: 'Failed to get response from AI',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Dappazon AI Server is running' });
});

app.listen(PORT, () => {
    console.log(`🤖 Dappazon AI Server running on http://localhost:${PORT}`);
    console.log(`✅ Groq API configured`);
    const addr = getContractAddress();
    console.log(`🔗 RPC: ${rpcUrl}`);
    console.log(`📦 Contract: ${addr || '(missing - set CONTRACT_ADDRESS or src/config.json)'}`);
});
