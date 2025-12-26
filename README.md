# Dappazon

## Technology Stack & Tools

- Solidity (Writing Smart Contracts & Tests)
- Javascript (React & Testing)
- [Hardhat](https://hardhat.org/) (Development Framework)
- [Ethers.js](https://docs.ethers.io/v5/) (Blockchain Interaction)
- [React.js](https://reactjs.org/) (Frontend Framework)

## Requirements For Initial Setup
- Install [NodeJS](https://nodejs.org/en/)

## Setting Up
### 1. Clone/Download the Repository

### 2. Install Dependencies:
`$ npm install`

### 3. Run tests
`$ npx hardhat test`

### 4. Start Hardhat node
`$ npx hardhat node`

### 5. Run deployment script
In a separate terminal execute:
`$ npx hardhat run ./scripts/deploy.js --network localhost`

### 6. Start frontend
`$ npm run start`

## Always keep the first 14 items (base catalog)

Nếu bạn muốn **mỗi lần chạy lại** (kể cả restart Hardhat node) đều **tự có sẵn 14 item gốc**, hãy dùng:

`$ npm run local`

Lệnh này sẽ:
- Start `hardhat node`
- Tự chạy `scripts/deploy.js` để deploy contract + list đủ **14 item** từ `src/items.json`

Sau đó bạn mở thêm terminal khác để chạy:
- `npm start` (frontend)
- `npm run server` (backend – để Admin chỉnh sản phẩm bằng pass 2211)

## Admin product management (server-signed transactions)

Trang `/admin` chỉ cần nhập pass `2211` để chỉnh sản phẩm, nhưng để **ghi lên blockchain** server phải ký giao dịch bằng ví **owner**.

### 1) Tạo file `.env` ở thư mục gốc (cùng cấp `server.js`)

Nội dung mẫu:

- `ADMIN_PASS=2211`
- `OWNER_PRIVATE_KEY=<private key của account #0 trên Hardhat node>`
- `BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`

> Lưu ý: Đây là cơ chế dành cho môi trường dev/local. Không nên dùng cách này cho production vì liên quan đến private key.

### 2) Chạy server

`$ npm run server`