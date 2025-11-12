import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface EccalStatus {
  summary: string;
  authEndpoint: {
    isWorking: boolean;
    currentError: string;
  };
  timestamp: string;
}

export function EccalStatusIndicator() {
  const { data: status, isLoading } = useQuery<EccalStatus>({
    queryKey: ['/api/eccal-status'],
    refetchInterval: 10000, // 每10秒檢查一次
    retry: false
  });

  if (isLoading) {
    return (
      <p className="text-xs text-white/60 mt-2">
        🔄 檢查 eccal 認證狀態...
      </p>
    );
  }

  if (!status) {
    return (
      <p className="text-xs text-white/60 mt-2">
        ❓ 無法連接 eccal 狀態檢查
      </p>
    );
  }

  const isWorking = status.authEndpoint?.isWorking;
  const error = status.authEndpoint?.currentError;

  return (
    <div className="text-xs text-white/60 mt-2">
      <p className="flex items-center gap-1">
        {isWorking ? (
          <>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            eccal 認證服務正常
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
            eccal 認證服務維護中
          </>
        )}
      </p>
      {!isWorking && error && (
        <p className="text-xs text-white/50 mt-1">
          狀態: {error === 'syntax error at or near "where"' ? 'SQL 修復中' : error}
        </p>
      )}
    </div>
  );
}