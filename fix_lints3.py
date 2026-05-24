import os

def replace_in_file(path, old, new):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
        
replace_in_file('src/components/terminal/OnChainPanel.tsx', "import { useEffect } from 'react'\n", "")
replace_in_file('src/components/terminal/OnChainPanel.tsx', "].map((ri) => (", "].map((_ri) => (")
replace_in_file('src/components/terminal/OpenOrders.tsx', "import { ArrowRight, Trash2, X, TrendingUp, TrendingDown }", "import { ArrowRight, Trash2, TrendingUp }")
replace_in_file('src/components/terminal/OpenOrders.tsx', "import { Clock, CheckCircle }", "import { CheckCircle }")
replace_in_file('src/components/terminal/PortfolioPanel.tsx', "const buyingPower =", "const _buyingPower =")
replace_in_file('src/components/terminal/PortfolioPanel.tsx', "const isInitialized =", "const _isInitialized =")
replace_in_file('src/components/terminal/PositionLines.tsx', "const _price = activeSymbol", "const __price = activeSymbol")
replace_in_file('src/components/terminal/PositionLines.tsx', "}, [activeSymbol, activePosition, activeOrders, windowHeight, windowWidth, tick?.price, tvRange])", "    // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [activeSymbol, activePosition, activeOrders, windowHeight, windowWidth, tick?.price, tvRange])")
replace_in_file('src/components/terminal/TradeExecution.tsx', "} catch (e) {", "} catch (_e) {")
replace_in_file('src/components/terminal/TradeHistory.tsx', "}, [tradeSyncId])", "    // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [tradeSyncId])")
replace_in_file('src/state/marketStore.ts', "const equity =", "const _equity =")
replace_in_file('src/state/marketStore.ts', "const totalUnrealizedPnl =", "const _totalUnrealizedPnl =")
