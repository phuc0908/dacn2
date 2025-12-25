import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useShop } from '../context/ShopContext';
import Rating from '../components/Rating';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { dappazon, account, addToCart } = useShop();

    const [item, setItem] = useState(null);
    const [order, setOrder] = useState(null);

    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchItem = async () => {
            if (!dappazon) return;
            const fetchedItem = await dappazon.items(id);
            if (fetchedItem.id.toString() === '0') return;
            setItem(fetchedItem);
        }
        fetchItem();
    }, [dappazon, id]);

    // Check purchase history for this item
    useEffect(() => {
        const fetchHistory = async () => {
            if (!dappazon || !account || !item) return;
            const events = await dappazon.queryFilter("Buy");
            const orders = events.filter(
                (event) => event.args.buyer === account && event.args.itemId.toString() === item.id.toString()
            );
            if (orders.length === 0) return;
            const orderDetails = await dappazon.orders(account, orders[0].args.orderId);
            setOrder(orderDetails);
        }
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dappazon, account, item]);

    const addToCartHandler = () => {
        addToCart(item, quantity);
        if (window.confirm(`Added ${quantity} ${item.name}(s) to cart!\nDo you want to go to Cart now?`)) {
            navigate('/cart');
        }
    }

    if (!item) return <div className='product_details_loading'>Loading...</div>;

    return (
        <div className="product-details-page">
            <div className="product-details-container">
                <div className="product-image">
                    <img src={item.image} alt="Product" />
                </div>
                <div className="product-info">
                    <h1>{item.name}</h1>
                    <Rating value={item.rating} />
                    <hr />
                    <p className="product-price">
                        {ethers.utils.formatUnits(item.cost.toString(), 'ether')} ETH
                    </p>
                    <hr />
                    <h3>Overview</h3>
                    <p>{item.category} - {item.stock.toString()} in stock</p>
                    <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>

                    {item.stock > 0 ? (
                        <div className="purchase-controls">
                            <div className="qty-selector">
                                <label>Qty:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={item.stock.toString()}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                />
                            </div>
                            <button className='product__buy' onClick={addToCartHandler}>
                                Add to Cart
                            </button>
                        </div>
                    ) : (
                        <button className='product__buy' disabled>
                            Out of Stock
                        </button>
                    )}

                    {order && (
                        <div className='product__bought'>
                            Last bought on <br />
                            <strong>
                                {new Date(Number(order.time.toString() + '000')).toLocaleDateString(
                                    undefined,
                                    {
                                        weekday: 'long',
                                        hour: 'numeric',
                                        minute: 'numeric',
                                        second: 'numeric'
                                    })}
                            </strong>
                        </div>
                    )}
                </div>
            </div>
            {/* Simple styling inline or we can add to index.css later */}
            <style>{`
                .product-details-page { 
                    padding: 40px; 
                    display: flex; 
                    justify-content: center;
                    background-color: #f4f4f4;
                    min-height: 100vh;
                }
                .product-details-container { 
                    display: flex; 
                    max-width: 1200px; 
                    width: 100%; 
                    gap: 60px; 
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
                .product-image {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #fff;
                }
                .product-image img { 
                    max-width: 100%; 
                    max-height: 500px; 
                    object-fit: contain; 
                }
                .product-info { 
                    flex: 1; 
                    display: flex;
                    flex-direction: column;
                }
                .product-info h1 {
                    font-size: 2rem;
                    color: #333;
                    margin-bottom: 10px;
                }
                .product-price { 
                    font-size: 28px; 
                    font-weight: 500; 
                    color: #B12704; 
                    margin: 15px 0;
                }
                .product__buy { 
                    width: 100%; 
                    padding: 15px; 
                    background: #ffd814; 
                    border: 1px solid #fcd200;
                    border-radius: 20px;
                    font-weight: 600; 
                    cursor: pointer; 
                    font-size: 1.1rem;
                    box-shadow: 0 2px 5px rgba(213, 217, 217, .5);
                }
                .product__buy:hover { 
                    background: #f7ca00; 
                    border-color: #f2c200;
                    box-shadow: 0 2px 5px rgba(213, 217, 217, .5);
                }
                .purchase-controls {
                    margin-top: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .qty-selector {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: bold;
                }
                .qty-selector input {
                    padding: 5px;
                    width: 60px;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                }
                .product__bought {
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #def4e9;
                    border-left: 5px solid #27ae60;
                    color: #27ae60;
                }
            `}</style>

        </div>
    );
};

export default ProductDetails;
