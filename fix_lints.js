const fs = require('fs');

function replaceFile(path, replacer) {
    if(!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    const newContent = replacer(content);
    if(content !== newContent) {
        fs.writeFileSync(path, newContent, 'utf8');
        console.log(`Fixed ${path}`);
    }
}

replaceFile('src/app/terminal/page.tsx', c => c.replace(/mounted && auth\.isLoggedIn\(\) \? getBinanceManager\(\)\.connectTicker\(\) : null/, 'if (mounted && auth.isLoggedIn()) getBinanceManager().connectTicker()'));
replaceFile('src/components/AIShowcase.tsx', c => c.replace(/what's performing today/g, "what&apos;s performing today"));
replaceFile('src/components/AuthFlow.tsx', c => c.replace(/onSuccess={user => {/g, 'onSuccess={() => {'));
replaceFile('src/components/CryptoGridDemo.tsx', c => c.replace(/import { useEffect, useMemo, useState }/g, 'import { useEffect, useState }'));
replaceFile('src/components/SpotlightCard.tsx', c => c.replace(/import { motion, useSpring, useTransform } from "framer-motion";/g, 'import { useSpring, useTransform } from "framer-motion";'));
replaceFile('src/components/Stepper.tsx', c => c.replace(/export interface StepProps extends React.HTMLAttributes<HTMLLIElement> {}/g, 'export type StepProps = React.HTMLAttributes<HTMLLIElement>'));
replaceFile('src/components/TerminalPreview.tsx', c => c.replace(/import { Activity, Clock, TrendingUp, TrendingDown, RefreshCcw/g, 'import { Activity, Clock, TrendingUp, RefreshCcw'));
replaceFile('src/components/profile/AvatarUpload.tsx', c => c.replace(/import { UploadCloud, CheckCircle, FileImage, Loader2 }/g, 'import { UploadCloud, CheckCircle, Loader2 }'));
replaceFile('src/components/terminal/AIInsights.tsx', c => c.replace(/        \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n/g, '').replace(/    }, \[\]\)/g, '        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [])'));
replaceFile('src/components/terminal/ChartPanel.tsx', c => c.replace(/chartRef\.current\.remove\(\)/g, 'const chart = chartRef.current; if(chart) chart.remove()').replace(/return \(\) => {\n            if \(chartRef\.current\)/g, 'return () => {\n            if (chart)'));
replaceFile('src/components/terminal/OnChainPanel.tsx', c => c.replace(/import { useEffect } from 'react'/g, '').replace(/\]\.map\(\(ri\) => \(/g, '].map((_ri) => ('));
replaceFile('src/components/terminal/OpenOrders.tsx', c => c.replace(/import { ArrowRight, Trash2, X, TrendingUp, TrendingDown }/g, 'import { ArrowRight, Trash2, TrendingUp }').replace(/import { Clock, CheckCircle }/g, 'import { CheckCircle }').replace(/        \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n/g, '').replace(/    }, \[tradeSyncId\]\)/g, '        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [tradeSyncId])'));
replaceFile('src/components/terminal/PortfolioPanel.tsx', c => c.replace(/const buyingPower = /g, 'const _buyingPower = ').replace(/const isInitialized = /g, 'const _isInitialized = '));
replaceFile('src/components/terminal/PositionLines.tsx', c => c.replace(/const _price = activeSymbol/g, 'const __price = activeSymbol').replace(/        \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n/g, '').replace(/    }, \[activeSymbol, /g, '        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [activeSymbol, '));
replaceFile('src/components/terminal/TradeExecution.tsx', c => c.replace(/} catch \(e\) {/g, '} catch (_e) {'));
replaceFile('src/components/terminal/TradeHistory.tsx', c => c.replace(/        \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n/g, '').replace(/    }, \[tradeSyncId\]\)/g, '        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [tradeSyncId])'));
replaceFile('src/state/marketStore.ts', c => c.replace(/const equity = /g, 'const _equity = ').replace(/const totalUnrealizedPnl = /g, 'const _totalUnrealizedPnl = '));
