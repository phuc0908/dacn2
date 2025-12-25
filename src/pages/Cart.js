import { ethers } from 'ethers';
import { useShop } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
    const { cart, removeFromCart, clearCart, dappazon, provider } = useShop();
    const navigate = useNavigate();

    const total = cart.reduce((acc, item) => acc + Number(ethers.utils.formatUnits(item.cost.toString(), 'ether')), 0);

    const checkoutHandler = async () => {
        const signer = await provider.getSigner();

        // Loop through cart items and buy one by one
        // Note: In a real app we would want a batchBuy function in smart contract
        try {
            for (const item of cart) {
                const transaction = await dappazon.connect(signer).buy(item.id, { value: item.cost });
                await transaction.wait();
            }
            clearCart();
            alert('Purchase Successful!');
            navigate('/history');
        } catch (error) {
            console.error("Checkout failed", error);
            alert("Checkout failed! See console for details.");
        }
    };

    return (
        <div className="cart-page">
            <h2>Your Shopping Cart</h2>

            {cart.length === 0 ? (
                <p>Your cart is empty.</p>
            ) : (
                <div className="cart-container">
                    <div className="cart-items">
                        {cart.map((item, index) => (
                            <div key={index} className="cart-item">
                                <img src={item.image} alt={item.name} />
                                <div className="cart-item-info">
                                    <h3>{item.name}</h3>
                                    <p>{ethers.utils.formatUnits(item.cost.toString(), 'ether')} ETH</p>
                                </div>
                                <button onClick={() => removeFromCart(index)}>Remove</button>
                            </div>
                        ))}
                    </div>
                    <div className="cart-summary">
                        <h3>Subtotal ({cart.length} items): {total.toFixed(4)} ETH</h3>
                        <button className="checkout-btn" onClick={checkoutHandler}>
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .cart-page { padding: 20px 50px; }
                .cart-container { display: flex; gap: 30px; }
                .cart-items { flex: 3; }
                .cart-item { display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #ddd; padding: 15px 0; }
                .cart-item img { width: 100px; height: 100px; object-fit: contain; }
                .cart-item-info { flex: 1; }
                .cart-summary { flex: 1; background: #f3f3f3; padding: 20px; height: fit-content; }
                .checkout-btn { width: 100%; padding: 10px; background: #f3ce10; border: none; cursor: pointer; font-weight: bold; margin-top: 10px; }
            `}</style>
        </div>
    );
};

export default Cart;
