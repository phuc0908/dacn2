import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Chatbot.css'

// Product name mapping for display
const productNames = {
    1: 'Camera', 2: 'Drone', 3: 'Headset', 4: 'Shoes',
    5: 'Sunglasses', 6: 'Watch', 7: 'Puzzle Cube', 8: 'Train Set',
    9: 'Robot Set', 10: 'Gaming Console', 11: 'VR Headset',
    12: 'Smart Speaker', 13: 'Denim Jacket', 14: 'Leather Boots'
}

const categoryNames = {
    electronics: 'Electronics & Gadgets',
    clothing: 'Clothing & Jewelry',
    toys: 'Toys & Gaming'
}

const Chatbot = ({ dappazon, account }) => {
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: 'Xin chào! Tôi là trợ lý AI của Dappazon. Tôi có thể giúp bạn tìm sản phẩm, giải thích về blockchain, hoặc **đưa bạn đến sản phẩm bạn muốn xem**. Hãy thử hỏi "Cho xem Drone" nhé!',
            actions: []
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

    // Handle action execution
    const executeAction = (action) => {
        switch (action.type) {
            case 'VIEW_PRODUCT':
                navigate(`/product/${action.payload}`)
                setIsOpen(false) // Close chatbot after navigation
                break
            case 'VIEW_CATEGORY':
                navigate('/')
                // Scroll to category section after navigation
                setTimeout(() => {
                    const categorySection = document.getElementById(action.payload)
                    if (categorySection) {
                        categorySection.scrollIntoView({ behavior: 'smooth' })
                    }
                }, 300)
                setIsOpen(false)
                break
            case 'GO_HOME':
                navigate('/')
                setIsOpen(false)
                break
            case 'GO_CART':
                navigate('/cart')
                setIsOpen(false)
                break
            default:
                console.log('Unknown action:', action)
        }
    }

    // Get action button label
    const getActionLabel = (action) => {
        switch (action.type) {
            case 'VIEW_PRODUCT':
                return `🛒 Xem ${productNames[action.payload] || 'Sản phẩm'}`
            case 'VIEW_CATEGORY':
                return `📂 Xem ${categoryNames[action.payload] || action.payload}`
            case 'GO_HOME':
                return '🏠 Về trang chủ'
            case 'GO_CART':
                return '🛒 Xem giỏ hàng'
            case 'WEB_SEARCH_RESULTS':
                return null // Don't show button, will render search results instead
            default:
                return 'Thực hiện'
        }
    }

    // Render web search results
    const renderSearchResults = (results) => {
        if (!results || results.length === 0) return null
        return (
            <div className="search-results">
                <div className="search-results-header">🔍 Kết quả tìm kiếm:</div>
                {results.map((result, index) => (
                    <a
                        key={index}
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="search-result-item"
                    >
                        <div className="search-result-title">{result.title}</div>
                        <div className="search-result-snippet">{result.snippet}</div>
                    </a>
                ))}
            </div>
        )
    }

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
                    conversationHistory: messages.slice(-10).map(msg => ({
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return {
                text: data.response,
                actions: data.actions || []
            };

        } catch (error) {
            console.error('Error calling AI:', error);

            // Fallback to basic responses if API fails
            const lowerMessage = userMessage.toLowerCase();

            if (lowerMessage.match(/^(hi|hello|xin chào|chào|hey)/)) {
                return {
                    text: 'Xin chào! Tôi có thể giúp bạn tìm sản phẩm. Thử hỏi "Cho xem Drone" hoặc "Sản phẩm điện tử"!',
                    actions: []
                };
            }

            if (lowerMessage.includes('drone')) {
                return {
                    text: 'Drone là sản phẩm hot với giá 2 ETH, đánh giá 5 sao! Bấm nút bên dưới để xem chi tiết.',
                    actions: [{ type: 'VIEW_PRODUCT', payload: '2' }]
                };
            }

            if (lowerMessage.includes('camera')) {
                return {
                    text: 'Camera có giá 1 ETH, đánh giá 4 sao. Xem chi tiết ngay!',
                    actions: [{ type: 'VIEW_PRODUCT', payload: '1' }]
                };
            }

            return {
                text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại!',
                actions: []
            };
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage = input.trim()
        setMessages(prev => [...prev, { type: 'user', text: userMessage, actions: [] }])
        setInput('')
        setIsTyping(true)

        // Call AI API
        const botResponse = await getBotResponse(userMessage)
        setMessages(prev => [...prev, {
            type: 'bot',
            text: botResponse.text,
            actions: botResponse.actions
        }])
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
                {isOpen ? '✕' : '🤖'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-container">
                    <div className="chatbot-header">
                        <div className="chatbot-header-content">
                            <div className="chatbot-avatar">🤖</div>
                            <div>
                                <h3>Dappazon AI Agent</h3>
                                <p className="chatbot-status">
                                    <span className="status-dot"></span>
                                    Có thể điều hướng & tương tác
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
                                <div className="message-content">
                                    <div className="message-bubble">
                                        {msg.text}
                                    </div>
                                    {/* Action Buttons and Search Results */}
                                    {msg.actions && msg.actions.length > 0 && (
                                        <div className="message-actions">
                                            {msg.actions.map((action, actionIndex) => {
                                                if (action.type === 'WEB_SEARCH_RESULTS') {
                                                    return renderSearchResults(action.payload)
                                                }
                                                const label = getActionLabel(action)
                                                if (!label) return null
                                                return (
                                                    <button
                                                        key={actionIndex}
                                                        className="action-button"
                                                        onClick={() => executeAction(action)}
                                                    >
                                                        {label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                                {msg.type === 'user' && <div className="message-avatar">👤</div>}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message bot">
                                <div className="message-avatar">🤖</div>
                                <div className="message-content">
                                    <div className="message-bubble typing">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-input-container">
                        <input
                            type="text"
                            className="chatbot-input"
                            placeholder="Thử hỏi: 'Cho xem Drone' hoặc 'Mua Camera'"
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
