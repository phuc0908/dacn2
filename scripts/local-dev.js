const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('[local] Starting Hardhat node...');

  const node = spawn('npx', ['hardhat', 'node'], { stdio: 'pipe', shell: true });

  let ready = false;
  const onData = (data) => {
    const text = data.toString();
    process.stdout.write(text);

    if (!ready && /Started HTTP and WebSocket JSON-RPC server/i.test(text)) {
      ready = true;
      bootstrap().catch((e) => {
        console.error('[local] bootstrap failed:', e);
        shutdown(1);
      });
    }
  };

  node.stdout.on('data', onData);
  node.stderr.on('data', (d) => process.stderr.write(d.toString()));

  node.on('exit', (code) => {
    if (!ready) {
      console.error(`[local] Hardhat node exited early with code ${code}`);
      process.exit(code ?? 1);
    }
    process.exit(code ?? 0);
  });

  async function bootstrap() {
    console.log('\n[local] Seeding base catalog (14 items)...');
    await run('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost']);

    console.log('\n[local] Done.');
    console.log('[local] Now run in separate terminals:');
    console.log('  - npm start        (frontend)');
    console.log('  - npm run server   (backend for admin writes/chat)');
    console.log('\n[local] Keep this terminal open to keep Hardhat node alive.');
  }

  function shutdown(code = 0) {
    try { node.kill('SIGINT'); } catch {}
    process.exit(code);
  }

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


