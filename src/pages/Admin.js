import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import itemsList from '../items.json';
import './Admin.css';

const ADMIN_PASS = '2211';

function shortAddr(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatEth(bn) {
  try {
    return ethers.utils.formatUnits(bn?.toString?.() ?? bn ?? '0', 'ether');
  } catch {
    return '0';
  }
}

function buildConicGradient(slices) {
  // slices: [{ label, value, color }]
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return { background: 'conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)', total };

  let acc = 0;
  const parts = slices.map((s) => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  return { background: `conic-gradient(${parts.join(', ')})`, total };
}

export default function Admin() {
  const navigate = useNavigate();
  const { dappazon, provider, account } = useShop();

  // Always require password when opening Admin page (no persistence).
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [orders, setOrders] = useState([]); // enriched orders: { buyer, orderId, itemId, time, item }
  const [owner, setOwner] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [invoiceLimit, setInvoiceLimit] = useState(25);
  const [buyerQuery, setBuyerQuery] = useState('');
  const [buyerLimit, setBuyerLimit] = useState(25);

  const login = (e) => {
    e?.preventDefault?.();
    if (pass.trim() !== ADMIN_PASS) {
      setErr('Sai mật khẩu. Nhập lại.');
      return;
    }
    setAuthed(true);
    setErr('');
  };

  const logout = () => {
    setAuthed(false);
    setPass('');
    setErr('');
    navigate('/');
  };

  useEffect(() => {
    const run = async () => {
      if (!authed) return;
      if (!dappazon || !provider) return;

      setLoading(true);
      try {
        const contractOwner = await dappazon.owner();
        setOwner(contractOwner);

        // Load items from chain (based on src/items.json length)
        const total = itemsList.items.length;
        const loaded = [];
        for (let i = 1; i <= total; i++) {
          const it = await dappazon.items(i);
          if (it?.id?.toString?.() !== '0') loaded.push(it);
        }
        setAllItems(loaded);

        // Load all Buy events -> derive buyers/orders + read order detail for each event
        const buyFilter = dappazon.filters.Buy();
        const events = await dappazon.queryFilter(buyFilter, 0, 'latest');

        const enriched = [];
        for (const ev of events) {
          const buyer = ev.args?.buyer;
          const orderId = ev.args?.orderId;
          const itemId = ev.args?.itemId;
          if (!buyer || !orderId || !itemId) continue;
          const o = await dappazon.orders(buyer, orderId);
          enriched.push({
            buyer,
            orderId: Number(orderId.toString()),
            itemId: Number(itemId.toString()),
            time: o.time,
            item: o.item,
            txHash: ev.transactionHash,
          });
        }

        // newest first
        enriched.sort((a, b) => Number(b.time?.toString?.() ?? 0) - Number(a.time?.toString?.() ?? 0));
        setOrders(enriched);
        setInvoiceLimit(25);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Admin load failed', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [authed, dappazon, provider, account]);

  const stats = useMemo(() => {
    const itemMap = new Map();
    for (const it of allItems) itemMap.set(Number(it.id.toString()), it);

    const totalProducts = allItems.length;
    const totalStock = allItems.reduce((a, it) => a + Number(it.stock.toString()), 0);
    const categories = new Set(allItems.map((it) => it.category));

    const buyers = new Map();
    const ordersByItem = new Map();
    let revenueWei = ethers.BigNumber.from('0');

    for (const o of orders) {
      buyers.set(o.buyer, (buyers.get(o.buyer) ?? 0) + 1);
      ordersByItem.set(o.itemId, (ordersByItem.get(o.itemId) ?? 0) + 1);

      const it = itemMap.get(o.itemId) || o.item;
      if (it?.cost) revenueWei = revenueWei.add(it.cost);
    }

    const topItems = Array.from(ordersByItem.entries())
      .map(([id, count]) => ({
        id,
        count,
        name: (itemMap.get(id) || {}).name || `#${id}`,
        category: (itemMap.get(id) || {}).category || 'unknown',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    const buyerListAll = Array.from(buyers.entries())
      .map(([addr, count]) => ({ addr, count }))
      .sort((a, b) => b.count - a.count);

    const revenueByCategory = new Map();
    for (const o of orders) {
      const it = itemMap.get(o.itemId) || o.item;
      const cat = it?.category || 'unknown';
      const prev = revenueByCategory.get(cat) || ethers.BigNumber.from('0');
      revenueByCategory.set(cat, prev.add(it?.cost || 0));
    }

    return {
      totalProducts,
      totalStock,
      categoriesCount: categories.size,
      totalOrders: orders.length,
      uniqueBuyers: buyers.size,
      revenueWei,
      topItems,
      buyerListAll,
      revenueByCategory,
      recentOrders: orders.slice(0, 10),
    };
  }, [allItems, orders]);

  const pieSlices = useMemo(() => {
    const colors = {
      electronics: '#0ea5e9',
      clothing: '#a855f7',
      toys: '#22c55e',
      unknown: '#64748b',
    };
    const slices = Array.from(stats.revenueByCategory.entries()).map(([label, bn]) => ({
      label,
      value: Number(ethers.utils.formatUnits(bn.toString(), 'ether')),
      color: colors[label] || '#f59e0b',
    }));
    // stable sort to keep colors consistent
    slices.sort((a, b) => b.value - a.value);
    return slices;
  }, [stats.revenueByCategory]);

  const pie = useMemo(() => buildConicGradient(pieSlices), [pieSlices]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const buyer = (o.buyer || '').toLowerCase();
      const name = (o.item?.name || '').toLowerCase();
      const category = (o.item?.category || '').toLowerCase();
      const tx = (o.txHash || '').toLowerCase();
      return buyer.includes(q) || name.includes(q) || category.includes(q) || tx.includes(q);
    });
  }, [orders, invoiceQuery]);

  const filteredBuyers = useMemo(() => {
    const q = buyerQuery.trim().toLowerCase();
    const list = stats.buyerListAll || [];
    if (!q) return list;
    return list.filter((b) => (b.addr || '').toLowerCase().includes(q));
  }, [stats.buyerListAll, buyerQuery]);

  if (!authed) {
    return (
      <div className="gate">
        <form className="gate__card" onSubmit={login}>
          <h2>Admin / Quản lý</h2>
          <p>Nhập mật khẩu để mở trang quản lý.</p>
          <div className="gate__row">
            <input
              className="gate__input"
              type="password"
              placeholder="Mật khẩu"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button className="admin__btn admin__btn--primary" type="submit">
              Mở
            </button>
          </div>
          {err && <div className="gate__error">{err}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin__header">
        <div className="admin__title">
          <h2>Trang quản lý Dappazon</h2>
          <p>
            {account ? (
              <>
                Wallet: <span className="pill">{shortAddr(account)}</span>
              </>
            ) : (
              <>Chưa kết nối ví (MetaMask).</>
            )}
            {owner && (
              <>
                &nbsp;•&nbsp; Owner: <span className="pill">{shortAddr(owner)}</span>
              </>
            )}
            {loading && <> &nbsp;•&nbsp; Đang tải dữ liệu...</>}
          </p>
        </div>
        <div className="admin__actions">
          <button className="admin__btn" type="button" onClick={() => window.location.reload()}>
            Refresh
          </button>
          <button className="admin__btn" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="admin__grid">
        <div className="admin__card admin__span-12">
          <h3>Tổng quan</h3>
          <div className="admin__metrics">
            <div className="metric">
              <div className="metric__label">Sản phẩm</div>
              <div className="metric__value">{stats.totalProducts}</div>
              <div className="metric__sub">Danh mục: {stats.categoriesCount}</div>
            </div>
            <div className="metric">
              <div className="metric__label">Tồn kho</div>
              <div className="metric__value">{stats.totalStock}</div>
              <div className="metric__sub">Tổng stock hiện tại</div>
            </div>
            <div className="metric">
              <div className="metric__label">Đơn hàng</div>
              <div className="metric__value">{stats.totalOrders}</div>
              <div className="metric__sub">Người mua: {stats.uniqueBuyers}</div>
            </div>
            <div className="metric">
              <div className="metric__label">Doanh thu (ước tính)</div>
              <div className="metric__value">{Number(formatEth(stats.revenueWei)).toFixed(4)} ETH</div>
              <div className="metric__sub">Tính theo giá item hiện tại</div>
            </div>
          </div>
        </div>

        <div className="admin__card admin__span-8">
          <div className="admin__cardHeader">
            <h3>Danh sách người mua</h3>
            <div className="admin__cardHeaderRight">
              <input
                className="admin__search"
                value={buyerQuery}
                onChange={(e) => setBuyerQuery(e.target.value)}
                placeholder="Tìm theo địa chỉ ví..."
              />
              <span className="pill">
                Hiển thị {Math.min(buyerLimit, filteredBuyers.length)}/{filteredBuyers.length}
              </span>
            </div>
          </div>

          {filteredBuyers.length === 0 ? (
            <div style={{ color: '#64748b' }}>Chưa có người mua.</div>
          ) : (
            <>
              <div className="admin__tableWrap" style={{ maxHeight: 420 }}>
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Buyer</th>
                      <th>Số đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuyers.slice(0, buyerLimit).map((b, idx) => (
                      <tr key={b.addr}>
                        <td style={{ fontWeight: 900 }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace' }}>{b.addr}</td>
                        <td style={{ fontWeight: 900 }}>{b.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {buyerLimit < filteredBuyers.length && (
                <div className="admin__footerActions">
                  <button
                    type="button"
                    className="admin__btn admin__btn--primary"
                    onClick={() => setBuyerLimit((n) => n + 25)}
                  >
                    Xem thêm
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="admin__card admin__span-4">
          <h3>Top sản phẩm</h3>
          {stats.topItems.length === 0 ? (
            <div style={{ color: '#64748b' }}>Chưa có dữ liệu.</div>
          ) : (
            <div className="barlist">
              {(() => {
                const max = Math.max(...stats.topItems.map((x) => x.count));
                return stats.topItems.map((x) => (
                  <div key={x.id} className="barrow">
                    <div className="barrow__label">{x.name}</div>
                    <div className="barrow__bar">
                      <div className="barrow__fill" style={{ width: `${(x.count / max) * 100}%` }} />
                    </div>
                    <div className="barrow__value">{x.count}</div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        <div className="admin__card admin__span-6">
          <h3>Doanh thu theo danh mục</h3>
          <div className="pieWrap">
            <div className="pie" style={{ background: pie.background }} />
            <div className="legend">
              {pieSlices.length === 0 ? (
                <div style={{ color: '#64748b' }}>Chưa có dữ liệu.</div>
              ) : (
                pieSlices.map((s) => (
                  <div key={s.label} className="legend__item">
                    <div className="legend__left">
                      <span className="dot" style={{ background: s.color }} />
                      {s.label}
                    </div>
                    <div style={{ fontWeight: 900 }}>{s.value.toFixed(4)} ETH</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="admin__card admin__span-6">
          <h3>Người mua (top)</h3>
          {stats.buyerListAll.length === 0 ? (
            <div style={{ color: '#64748b' }}>Chưa có dữ liệu.</div>
          ) : (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Số đơn</th>
                </tr>
              </thead>
              <tbody>
                {stats.buyerListAll.slice(0, 8).map((b) => (
                  <tr key={b.addr}>
                    <td>{shortAddr(b.addr)}</td>
                    <td style={{ fontWeight: 900 }}>{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin__card admin__span-12">
          <h3>Đơn gần đây</h3>
          {stats.recentOrders.length === 0 ? (
            <div style={{ color: '#64748b' }}>Chưa có đơn nào.</div>
          ) : (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Buyer</th>
                  <th>Item</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={`${o.buyer}-${o.orderId}`}>
                    <td>{new Date(Number(o.time.toString() + '000')).toLocaleString()}</td>
                    <td>{shortAddr(o.buyer)}</td>
                    <td style={{ fontWeight: 900 }}>{o.item?.name || `#${o.itemId}`}</td>
                    <td>{Number(formatEth(o.item?.cost)).toFixed(4)} ETH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin__card admin__span-12">
          <div className="admin__cardHeader">
            <h3>Tất cả hoá đơn đã bán</h3>
            <div className="admin__cardHeaderRight">
              <input
                className="admin__search"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                placeholder="Tìm theo buyer / tên sản phẩm / category / tx hash..."
              />
              <span className="pill">
                Hiển thị {Math.min(invoiceLimit, filteredInvoices.length)}/{filteredInvoices.length}
              </span>
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div style={{ color: '#64748b' }}>Chưa có hoá đơn nào.</div>
          ) : (
            <>
              <div className="admin__tableWrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Buyer</th>
                      <th>OrderId</th>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Cost</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.slice(0, invoiceLimit).map((o, idx) => (
                      <tr key={`${o.txHash || 'tx'}-${o.buyer}-${o.orderId}`}>
                        <td style={{ fontWeight: 900 }}>{idx + 1}</td>
                        <td>{new Date(Number(o.time.toString() + '000')).toLocaleString()}</td>
                        <td>{shortAddr(o.buyer)}</td>
                        <td style={{ fontWeight: 900 }}>{o.orderId}</td>
                        <td style={{ fontWeight: 900 }}>{o.item?.name || `#${o.itemId}`}</td>
                        <td>{o.item?.category || '-'}</td>
                        <td>{Number(formatEth(o.item?.cost)).toFixed(4)} ETH</td>
                        <td>{o.txHash ? shortAddr(o.txHash) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoiceLimit < filteredInvoices.length && (
                <div className="admin__footerActions">
                  <button
                    type="button"
                    className="admin__btn admin__btn--primary"
                    onClick={() => setInvoiceLimit((n) => n + 25)}
                  >
                    Xem thêm
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


