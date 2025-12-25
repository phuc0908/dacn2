import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import './Chatbot.css'

const Chatbot = ({ dappazon, account }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: 'Xin chào! Tôi là trợ lý AI của Dappazon. Tôi có thể giúp bạn tìm sản phẩm, giải thích về blockchain, hoặc trả lời câu hỏi về cửa hàng. Bạn cần giúp gì?'
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const getBotResponse = async (userMessage) => {
        try {
            // Call backend API
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    conversationHistory: messages.map(msg => ({
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.response;

        } catch (error) {
            console.error('Error calling AI:', error);

            // Fallback to basic responses if API fails
            const lowerMessage = userMessage.toLowerCase();

            if (lowerMessage.match(/^(hi|hello|xin chào|chào|hey)/)) {
                return 'Xin chào! Tôi có thể giúp bạn tìm sản phẩm điện tử, quần áo, đồ chơi, hoặc giải thích về cách mua hàng bằng Ethereum. Bạn muốn biết gì?';
            }

            if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('product')) {
                return 'Chúng tôi có nhiều sản phẩm: Camera, Drone, Headset, Shoes, Sunglasses, Watch, Puzzle Cube, Train Set, Robot Set. Bạn muốn biết thêm về sản phẩm nào?';
            }

            return 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau hoặc hỏi về sản phẩm, giá cả, blockchain, hoặc MetaMask!';
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage = input.trim()
        setMessages(prev => [...prev, { type: 'user', text: userMessage }])
        setInput('')
        setIsTyping(true)

        // Call AI API
        const botResponse = await getBotResponse(userMessage)
        setMessages(prev => [...prev, { type: 'bot', text: botResponse }])
        setIsTyping(false)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <>
            {/* Chat Toggle Button */}
            <button
                className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle chatbot"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-container">
                    <div className="chatbot-header">
                        <div className="chatbot-header-content">
                            <div className="chatbot-avatar">🤖</div>
                            <div>
                                <h3>Dappazon AI Assistant</h3>
                                <p className="chatbot-status">
                                    <span className="status-dot"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <button
                            className="chatbot-close"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.type}`}>
                                {msg.type === 'bot' && <div className="message-avatar">🤖</div>}
                                <div className="message-bubble">
                                    {msg.text}
                                </div>
                                {msg.type === 'user' && <div className="message-avatar">👤</div>}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message bot">
                                <div className="message-avatar">🤖</div>
                                <div className="message-bubble typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-input-container">
                        <input
                            type="text"
                            className="chatbot-input"
                            placeholder="Nhập câu hỏi của bạn..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button
                            className="chatbot-send"
                            onClick={handleSend}
                            disabled={!input.trim()}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

export default Chatbot
