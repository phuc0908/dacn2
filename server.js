const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Initialize blockchain connection
const provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
const contractAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Load contract ABI
const contractABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'src', 'abis', 'Dappazon.json'), 'utf8')
);

// Load items to know total count
const { items } = require('./src/items.json');

const dappazonContract = new ethers.Contract(contractAddress, contractABI, provider);

// Middleware
app.use(cors());
app.use(express.json());

// Product name to ID mapping for quick lookup
const productNameToId = {};
items.forEach(item => {
    productNameToId[item.name.toLowerCase()] = item.id;
});

// Function to fetch products from blockchain
async function getProductsFromBlockchain() {
    try {
        const products = {
            electronics: [],
            clothing: [],
            toys: []
        };

        // Fetch all products dynamically based on items.json count
        for (let i = 1; i <= items.length; i++) {
            const item = await dappazonContract.items(i);
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

// Function to parse actions from LLM response
function parseActions(response) {
    const actionRegex = /\[ACTION:(\w+):?([^\]]*)\]/g;
    const actions = [];
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
        actions.push({
            type: match[1],
            payload: match[2] || null
        });
    }

    // Remove action tags from response text
    const cleanResponse = response.replace(actionRegex, '').trim();

    return { cleanResponse, actions };
}

// Function to search web using SERPAPI
async function searchWeb(query) {
    try {
        const serpApiKey = process.env.SERPAPI_KEY;
        if (!serpApiKey) {
            console.error('SERPAPI_KEY not configured');
            return null;
        }

        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: query,
                api_key: serpApiKey,
                engine: 'google',
                num: 5,
                hl: 'vi' // Vietnamese language
            }
        });

        const results = response.data.organic_results || [];
        return results.slice(0, 5).map(result => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet
        }));
    } catch (error) {
        console.error('SERPAPI Error:', error.message);
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

**QUAN TRỌNG - ACTIONS:**
Khi người dùng muốn xem sản phẩm cụ thể, thêm action tag vào cuối response:

Danh sách sản phẩm và ID:
- Camera = 1, Drone = 2, Headset = 3, Shoes = 4, Sunglasses = 5, Watch = 6
- Puzzle Cube = 7, Train Set = 8, Robot Set = 9, Gaming Console = 10
- VR Headset = 11, Smart Speaker = 12, Denim Jacket = 13, Leather Boots = 14

Các action có thể dùng:
- [ACTION:VIEW_PRODUCT:id] - Khi user muốn xem/mua sản phẩm. Ví dụ: [ACTION:VIEW_PRODUCT:2]
- [ACTION:VIEW_CATEGORY:category] - Khi user muốn xem danh mục (electronics/clothing/toys)
- [ACTION:GO_HOME] - Khi user muốn về trang chủ
- [ACTION:GO_CART] - Khi user muốn xem giỏ hàng
- [ACTION:WEB_SEARCH:query] - Khi user hỏi về thông tin BÊN NGOÀI Dappazon (tin tức crypto, giá ETH, thông tin blockchain mới nhất, etc.)

Ví dụ responses:
- User: "Cho xem Drone" → "Đây là Drone - flycam chất lượng cao với giá 2 ETH! [ACTION:VIEW_PRODUCT:2]"
- User: "Mua Camera" → "Camera có giá 1 ETH, đánh giá 4 sao. Bấm nút bên dưới để xem chi tiết! [ACTION:VIEW_PRODUCT:1]"
- User: "Sản phẩm điện tử" → "Chúng tôi có Camera, Drone, Headset... [ACTION:VIEW_CATEGORY:electronics]"
- User: "Giá ETH hôm nay" → "Để tôi tìm kiếm giá ETH mới nhất cho bạn... [ACTION:WEB_SEARCH:giá ethereum hôm nay]"
- User: "Tin tức crypto mới" → "Tôi sẽ tìm tin tức crypto mới nhất! [ACTION:WEB_SEARCH:tin tức cryptocurrency mới nhất]"

QUAN TRỌNG VỀ WEB SEARCH:
- Chỉ dùng WEB_SEARCH khi user hỏi thông tin NGOÀI Dappazon
- Các câu hỏi về sản phẩm Dappazon → trả lời từ dữ liệu blockchain ở trên
- Các câu hỏi về giá crypto, tin tức, thông tin bên ngoài → dùng WEB_SEARCH

Hãy trả lời một cách tự nhiên, hữu ích và chuyên nghiệp! Luôn thêm action khi phù hợp để giúp user dễ dàng tương tác.

`;
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

        // Models to try (in order of preference)
        const models = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'gemma2-9b-it',
            'mixtral-8x7b-32768'
        ];

        let completion = null;
        let usedModel = null;

        // Try each model until one works
        for (const model of models) {
            try {
                completion = await groq.chat.completions.create({
                    messages: messages,
                    model: model,
                    temperature: 0.7,
                    max_tokens: 500,
                    top_p: 1,
                    stream: false
                });
                usedModel = model;
                break; // Success, exit loop
            } catch (modelError) {
                if (modelError.status === 429) {
                    console.log(`Rate limit on ${model}, trying next model...`);
                    continue; // Try next model
                }
                throw modelError; // Other error, throw it
            }
        }

        if (!completion) {
            throw new Error('All models are rate limited. Please try again later.');
        }

        console.log(`✅ Using model: ${usedModel}`);

        let rawResponse = completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

        // Parse actions from response
        let { cleanResponse, actions } = parseActions(rawResponse);

        // Check if there's a WEB_SEARCH action and execute it
        const webSearchAction = actions.find(a => a.type === 'WEB_SEARCH');
        if (webSearchAction && webSearchAction.payload) {
            const searchResults = await searchWeb(webSearchAction.payload);

            if (searchResults && searchResults.length > 0) {
                // Build messages with search results for a follow-up response
                const searchContext = searchResults.map((r, i) =>
                    `${i + 1}. ${r.title}\n   ${r.snippet}\n   Link: ${r.link}`
                ).join('\n\n');

                const followUpMessages = [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...conversationHistory,
                    { role: 'user', content: message },
                    { role: 'assistant', content: rawResponse },
                    { role: 'user', content: `Đây là kết quả tìm kiếm web:\n\n${searchContext}\n\nHãy tóm tắt thông tin này một cách ngắn gọn và hữu ích cho người dùng. Trả lời bằng tiếng Việt.` }
                ];

                const followUpCompletion = await groq.chat.completions.create({
                    messages: followUpMessages,
                    model: usedModel, // Use same model that worked
                    temperature: 0.7,
                    max_tokens: 600,
                    top_p: 1,
                    stream: false
                });

                const followUpResponse = followUpCompletion.choices[0]?.message?.content || cleanResponse;
                const parsed = parseActions(followUpResponse);
                cleanResponse = parsed.cleanResponse;
                // Keep the WEB_SEARCH action but add search results
                actions = [{
                    type: 'WEB_SEARCH_RESULTS',
                    payload: searchResults
                }];
            }
        }

        res.json({
            response: cleanResponse,
            actions: actions,
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
});
