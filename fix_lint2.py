import re

def fix_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('src/app/terminal/page.tsx', [
    ("import { destroyAllSockets } from '@/services/binanceSocket'", "import { } from '@/services/binanceSocket'"),
    ("mounted && auth.isLoggedIn() ? getBinanceManager().connectTicker() : null", "if (mounted && auth.isLoggedIn()) { getBinanceManager().connectTicker() }"),
])

fix_file('src/components/AIShowcase.tsx', [
    ("what's", "what&apos;s"),
])

fix_file('src/components/ContactForm.tsx', [
    ("import { Mail, MessageSquare, Send }", "import { Mail, MessageSquare }"),
])

fix_file('src/components/CryptoGridDemo.tsx', [
    ("import { useState, useEffect, useMemo }", "import { useState, useEffect }"),
])

fix_file('src/components/SpotlightCard.tsx', [
    ("import { motion } from 'framer-motion'\n", ""),
])

fix_file('src/components/Stepper.tsx', [
    ("export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {}", "export type StepperProps = React.HTMLAttributes<HTMLDivElement>"),
])

fix_file('src/components/TerminalPreview.tsx', [
    ("import { Terminal, Activity, Zap, TrendingUp, TrendingDown, ArrowRight }", "import { Terminal, Activity, Zap, TrendingUp, ArrowRight }"),
])

fix_file('src/components/profile/AvatarUpload.tsx', [
    ("import { Camera, Upload, X, Loader2, FileImage }", "import { Camera, Upload, X, Loader2 }"),
])

fix_file('src/components/terminal/AIInsights.tsx', [
    ("  }, [activeSymbol])", "  }, [activeSymbol, prices])"),
])

fix_file('src/components/terminal/ChartPanel.tsx', [
    ("return () => {\n            if (ref.current) {\n                ref.current.removeChild(chartContainerRef.current)", "const currentRef = ref.current;\n        return () => {\n            if (currentRef) {\n                currentRef.removeChild(chartContainerRef.current)"),
])

fix_file('src/components/terminal/OnChainPanel.tsx', [
    ("import { useState, useEffect } from 'react'", "import { useState } from 'react'"),
    ("const ri =", "const _ri ="),
])

fix_file('src/components/terminal/OpenOrders.tsx', [
    ("import { X, CheckCircle2, AlertCircle, Trash2, TrendingUp, TrendingDown }", "import { CheckCircle2, AlertCircle, Trash2, TrendingUp }"),
    ("import { Clock } from 'lucide-react'\n", ""),
    ("  }, [tradeSyncId, getOrders])", "  }, [getOrders])"),
])

fix_file('src/components/terminal/PortfolioPanel.tsx', [
    ("    const buyingPower = useMarketStore(s => s.walletBalance)\n", ""),
    ("    const isInitialized = useMarketStore(s => s.isInitialized)\n", ""),
])

fix_file('src/components/terminal/PositionLines.tsx', [
    ("                const _price = ", "                // const _price = "),
    ("    }, [series, activeSymbol, holdings])", "    }, [series, holdings])"),
])

fix_file('src/components/terminal/TradeExecution.tsx', [
    ("        } catch (e: any) {", "        } catch {"),
])

fix_file('src/components/terminal/TradeHistory.tsx', [
    ("  }, [tradeSyncId, getHistory])", "  }, [getHistory])"),
])

fix_file('src/components/ui/interactive-grid-pattern.tsx', [
    ("  interface CellState {", "  // interface CellState {"),
    ("    x: number;", "    // x: number;"),
    ("    y: number;", "    // y: number;"),
    ("    colorIndex: number;", "    // colorIndex: number;"),
    ("  }", "  // }"),
])

fix_file('src/state/marketStore.ts', [
    ("        const equity = totalPortValue", "        // const equity = totalPortValue"),
    ("        const totalUnrealizedPnl = holdings.reduce((sum, h) => {\n            const tick = get().prices[`${h.coin}USDT`]\n            const current = tick?.price || h.currentPrice\n            const pnl = (current - h.avgBuyPrice) * h.quantity\n            return sum + pnl\n        }, 0)", "        // const totalUnrealizedPnl = holdings.reduce((sum, h) => { const tick = get().prices[`${h.coin}USDT`]; const current = tick?.price || h.currentPrice; const pnl = (current - h.avgBuyPrice) * h.quantity; return sum + pnl; }, 0)"),
])

print("Fixes applied 2!")
