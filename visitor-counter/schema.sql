-- 每天一列：台灣日期與當天的造訪人次；累計是所有列的總和
CREATE TABLE IF NOT EXISTS daily_visits (
    day TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);
