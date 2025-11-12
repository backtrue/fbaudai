# Eccal JWT 整合錯誤報告

## 錯誤摘要
報受眾 (audai.thinkwithblack.com) 無法正確獲取用戶的會員等級和點數資訊。

## 問題詳情

### 1. JWT Token 缺少必要欄位
**當前 JWT payload (來自 eccal):**
```json
{
  "sub": "fde58ee5-902a-4b9d-8bac-152d48b25fd5",
  "email": "test@example.com",
  "name": "Test User",
  "service": "audai",
  "iss": "eccal.thinkwithblack.com",
  "aud": "https://audai.thinkwithblack.com",
  "iat": 1752335046,
  "exp": 1752939846
}
```

**缺少的欄位:**
- `membership`: 會員等級 (free, pro, premium)
- `credits`: 剩餘點數

### 2. 用戶資料查詢失敗
**測試結果:**
- `GET /api/account-center/user/backtrue@gmail.com` → 404 用戶未找到
- `GET /api/account-center/user/{userId}` → 404 用戶未找到

**預期行為:**
- 應該能夠查詢到 backtrue@gmail.com 的會員資料
- 該用戶應該有 "pro" 會員等級和 45 點數

### 3. 具體影響的功能
- 用戶無法看到正確的會員等級
- 用戶無法看到剩餘點數
- 點數扣除功能無法正常運作
- 會員限制功能無法正確執行

## 解決方案

### 立即修復 (高優先級)
1. **修改 JWT token 生成邏輯:**
   - 在 eccal 的 JWT 簽發過程中，添加 `membership` 和 `credits` 欄位
   - 確保這些欄位在 token 生成時從用戶資料庫中正確讀取

2. **確保用戶資料存在:**
   - 在 eccal 系統中確認 backtrue@gmail.com 用戶的資料
   - 設定正確的會員等級和點數

### 中期修復 (中優先級)
1. **實作用戶資料查詢端點:**
   - 建立 `GET /api/account-center/user/{userId}` 端點
   - 回傳完整的用戶資料包括會員等級和點數

2. **實作點數扣除端點:**
   - 建立 `POST /api/account-center/credits/{userId}/deduct` 端點
   - 支援跨服務的點數扣除

## 測試驗證

### 測試用戶資料
```json
{
  "id": "實際的用戶ID",
  "email": "backtrue@gmail.com",
  "name": "煜庭",
  "membership": "pro",
  "credits": 45
}
```

### 測試步驟
1. 用 backtrue@gmail.com 登入 eccal
2. 獲得 JWT token
3. 驗證 token 中包含 membership 和 credits 欄位
4. 使用 token 在報受眾中登入
5. 確認界面顯示正確的會員等級和點數

## 緊急聯繫
如需立即修復，請聯繫報受眾開發團隊。

---
**創建時間:** 2025-07-12  
**報告者:** 報受眾開發團隊  
**狀態:** 待修復