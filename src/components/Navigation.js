import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import './Navigation.css'; // We might need to create this css file if not exist or inspect index.css

const Navigation = () => {
    const { account, setAccount, cart } = useShop();

    const connectHandler = async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = ethers.utils.getAddress(accounts[0]);
        setAccount(account);
    }

    return (
        <nav>
            <div className='nav__brand'>
                <Link to="/"><h1>Dappazon</h1></Link>
            </div>

            <input
                type="text"
                className="nav__search"
            />

            <ul className='nav__links'>
                <li><Link to="/history">History</Link></li>
                <li>
                    <Link to="/cart" className="cart-link">
                        Cart
                        {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
                    </Link>
                </li>

                {account ? (
                    <li>
                        <button type="button" className='nav__connect'>
                            {account.slice(0, 6) + '...' + account.slice(38, 42)}
                        </button>
                    </li>
                ) : (
                    <li>
                        <button type="button" className='nav__connect' onClick={connectHandler}>
                            Connect
                        </button>
                    </li>
                )}
            </ul>
        </nav>
    );
}

export default Navigation;