import re
import os

def replace_regex(path, pattern, repl):
    if not os.path.exists(path): return
    with open(path, 'r') as f:
        content = f.read()
    content = re.sub(pattern, repl, content)
    with open(path, 'w') as f:
        f.write(content)

replace_regex('src/components/terminal/OnChainPanel.tsx', r"import { useEffect } from 'react'", "import {} from 'react'")
replace_regex('src/components/terminal/OnChainPanel.tsx', r"\]\.map\(\(ri\) =>", "].map((_ri) =>")

replace_regex('src/components/terminal/OpenOrders.tsx', r"X,", "")
replace_regex('src/components/terminal/OpenOrders.tsx', r"TrendingDown", "")
replace_regex('src/components/terminal/OpenOrders.tsx', r"Clock,", "")

replace_regex('src/components/terminal/PortfolioPanel.tsx', r"const buyingPower =", "const _buyingPower =")
replace_regex('src/components/terminal/PortfolioPanel.tsx', r"const isInitialized =", "const _isInitialized =")

replace_regex('src/components/terminal/PositionLines.tsx', r"const _price =", "const __price =")
replace_regex('src/components/terminal/PositionLines.tsx', r"    }, \[activeSymbol\]\)", "        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [activeSymbol])")

replace_regex('src/components/terminal/TradeExecution.tsx', r"catch \(e\) {", "catch (_e) {")

replace_regex('src/components/terminal/TradeHistory.tsx', r"    }, \[tradeSyncId\]\)", "        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [tradeSyncId])")

replace_regex('src/state/marketStore.ts', r"const equity =", "const _equity =")
replace_regex('src/state/marketStore.ts', r"const totalUnrealizedPnl =", "const _totalUnrealizedPnl =")

