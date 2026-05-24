import re

def fix_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

# src/app/terminal/page.tsx
fix_file('src/app/terminal/page.tsx', [
    ("import { destroyAllSockets } from '@/services/binanceSocket'", "import {} from '@/services/binanceSocket'"),
    ("    }, [])", "    }, [LOAD_MESSAGES.length])"),
    ("mounted && auth.isLoggedIn() ? getBinanceManager().connectTicker() : null", "if (mounted && auth.isLoggedIn()) { getBinanceManager().connectTicker() }")
])

# src/components/AIShowcase.tsx
fix_file('src/components/AIShowcase.tsx', [
    ("what's", "what&apos;s"),
])

# src/components/ContactForm.tsx
fix_file('src/components/ContactForm.tsx', [
    ("import { Mail, MessageSquare, Send }", "import { Mail, MessageSquare }"),
])

# src/components/CryptoGridDemo.tsx
fix_file('src/components/CryptoGridDemo.tsx', [
    ("import { useState, useEffect, useMemo }", "import { useState, useEffect }"),
])

# src/components/SpotlightCard.tsx
fix_file('src/components/SpotlightCard.tsx', [
    ("import { motion } from 'framer-motion'", ""),
])

# src/components/Stepper.tsx
fix_file('src/components/Stepper.tsx', [
    ("export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {}", "export type StepperProps = React.HTMLAttributes<HTMLDivElement>"),
])

# src/components/TerminalPreview.tsx
fix_file('src/components/TerminalPreview.tsx', [
    ("import { Terminal, Activity, Zap, TrendingUp, TrendingDown, ArrowRight }", "import { Terminal, Activity, Zap, TrendingUp, ArrowRight }"),
])

# src/components/profile/AvatarUpload.tsx
fix_file('src/components/profile/AvatarUpload.tsx', [
    ("import { Camera, Upload, X, Loader2, FileImage }", "import { Camera, Upload, X, Loader2 }"),
])

# src/components/terminal/AIInsights.tsx
fix_file('src/components/terminal/AIInsights.tsx', [
    ("  }, [activeSymbol])", "  }, [activeSymbol, prices])"),
])

# src/components/terminal/ChartPanel.tsx
fix_file('src/components/terminal/ChartPanel.tsx', [
    ("return () => {\n            if (ref.current)", "const currentRef = ref.current;\n        return () => {\n            if (currentRef)"),
    ("ref.current.removeChild(chartContainerRef.current)", "currentRef.removeChild(chartContainerRef.current)"),
])

# src/components/terminal/OnChainPanel.tsx
fix_file('src/components/terminal/OnChainPanel.tsx', [
    ("import { useState, useEffect } from 'react'", "import { useState } from 'react'"),
    ("import { useMarketStore } from '@/state/marketStore'", ""),
    ("const ri =", "const _ri ="),
])

# src/components/terminal/OpenOrders.tsx
fix_file('src/components/terminal/OpenOrders.tsx', [
    ("import { X, CheckCircle2, AlertCircle, Trash2, TrendingUp, TrendingDown }", "import { CheckCircle2, AlertCircle, Trash2, TrendingUp }"),
    ("import { Clock } from 'lucide-react'", ""),
    ("  }, [tradeSyncId, getOrders])", "  }, [getOrders])"),
])

# src/components/terminal/PortfolioPanel.tsx
fix_file('src/components/terminal/PortfolioPanel.tsx', [
    ("    const buyingPower = useMarketStore(s => s.walletBalance)", ""),
    ("    const isInitialized = useMarketStore(s => s.isInitialized)", ""),
])

# src/components/terminal/PositionLines.tsx
fix_file('src/components/terminal/PositionLines.tsx', [
    ("                const _price = ", "                // const _price = "),
    ("// @ts-ignore", "// @ts-expect-error"),
    ("    }, [series, activeSymbol, holdings])", "    }, [series, holdings])"),
])

# src/components/terminal/TradeExecution.tsx
fix_file('src/components/terminal/TradeExecution.tsx', [
    ("        } catch (e) {", "        } catch {"),
])

# src/components/terminal/TradeHistory.tsx
fix_file('src/components/terminal/TradeHistory.tsx', [
    ("  }, [tradeSyncId, getHistory])", "  }, [getHistory])"),
])

# src/components/ui/interactive-grid-pattern.tsx
fix_file('src/components/ui/interactive-grid-pattern.tsx', [
    ("  interface CellState ", "  type CellState = any; // "),
])

# src/services/binanceSocket.ts
fix_file('src/services/binanceSocket.ts', [
    ("const statsCache", "// const statsCache"),
])

# src/state/marketStore.ts
fix_file('src/state/marketStore.ts', [
    ("      } catch (e) {", "      } catch {"),
    ("        const equity = totalPortValue", "        // const equity = totalPortValue"),
    ("        const totalUnrealizedPnl = holdings.reduce((sum, h) => {", "        // const totalUnrealizedPnl = holdings.reduce((sum, h) => {"),
    ("            return sum + pnl\n        }, 0)", "        //    return sum + pnl\n        // }, 0)"),
    ("        // const totalUnrealizedPnl = holdings.reduce((sum, h) => {\n            const tick", "        // const totalUnrealizedPnl = holdings.reduce((sum, h) => {\n        //     const tick"),
    ("        //     const tick = get().prices[`${h.coin}USDT`]\n            const current", "        //     const tick = get().prices[`${h.coin}USDT`]\n        //     const current"),
    ("        //     const current = tick?.price || h.currentPrice\n            const pnl", "        //     const current = tick?.price || h.currentPrice\n        //     const pnl"),
])

print("Fixes applied!")
