import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useShop } from '../context/ShopContext';

const History = () => {
    const { dappazon, account } = useShop();
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!dappazon || !account) return;

            // Get order count
            // Note: In Dappazon.sol, orderCount is public mapping(address => uint256)
            const count = await dappazon.orderCount(account);
            const loadedOrders = [];

            for (let i = 1; i <= count; i++) {
                const order = await dappazon.orders(account, i);
                loadedOrders.push(order);
            }
            // Reverse to show latest first
            setOrders(loadedOrders.reverse());
        }

        fetchOrders();
    }, [dappazon, account]);

    return (
        <div className="history-page">
            <h2>Your Order History</h2>

            {orders.length === 0 ? (
                <p>You have no past orders.</p>
            ) : (
                <div className="orders-list">
                    {orders.map((order, index) => (
                        <div key={index} className="order-card">
                            <div className="order-header">
                                <span>Order Placed: {new Date(Number(order.time.toString() + '000')).toLocaleString()}</span>
                                <span>Buyer: {order.buyer}</span>
                                <span>Total: {ethers.utils.formatUnits(order.item.cost.toString(), 'ether')} ETH</span>
                            </div>
                            <div className="order-body">
                                <img
                                    src={
                                        (Number(order?.item?.id?.toString?.() ?? order?.item?.id ?? 0) === 11 ||
                                            order?.item?.name === 'VR Headset')
                                            ? '/assets/items/vr-headset.jpg'
                                            : order.item.image
                                    }
                                    onError={(e) => {
                                        if (e.currentTarget.src !== order.item.image) e.currentTarget.src = order.item.image
                                    }}
                                    alt={order.item.name}
                                />
                                <div>
                                    <h3>{order.item.name}</h3>
                                    <p>Detail: {order.item.category}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .history-page { padding: 20px 50px; }
                .order-card { border: 1px solid #ddd; margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
                .order-header { background: #f0f2f2; padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; flex-wrap: wrap; gap: 10px; }
                .order-body { padding: 20px; display: flex; gap: 20px; align-items: center; }
                .order-body img { width: 80px; height: 80px; object-fit: contain; }
            `}</style>
        </div>
    );
};

export default History;
