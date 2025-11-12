import { spawn } from 'child_process';

/**
 * 自動同步數據庫 schema
 * 在應用啟動時執行，確保生產和開發環境的數據庫結構一致
 */
export async function syncDatabaseSchema(): Promise<void> {
  // 允許跳過數據庫同步（用於測試或特殊場景）
  if (process.env.SKIP_DB_SYNC === 'true') {
    console.log('⏭️  跳過數據庫同步（SKIP_DB_SYNC=true）');
    return;
  }

  // 檢查 DATABASE_URL 是否存在
  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL 環境變量未設置，無法同步數據庫');
  }

  console.log('🔄 開始同步數據庫 schema...');

  return new Promise((resolve, reject) => {
    // 使用 npx drizzle-kit push --force 自動同步數據庫
    const child = spawn('npx', ['drizzle-kit', 'push', '--force'], {
      stdio: 'inherit', // 繼承 stdio 以顯示詳細輸出
      shell: true,
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ 數據庫 schema 同步成功');
        resolve();
      } else {
        const error = new Error(`❌ 數據庫同步失敗，退出碼: ${code}`);
        console.error(error.message);
        reject(error);
      }
    });

    child.on('error', (error) => {
      console.error('❌ 執行數據庫同步命令時發生錯誤:', error);
      reject(error);
    });
  });
}
