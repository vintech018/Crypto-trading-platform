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

replaceFile('src/components/TerminalPreview.tsx', c => c.replace(/TrendingDown, /g, ''));
replaceFile('src/components/profile/AvatarUpload.tsx', c => c.replace(/FileImage, /g, ''));
replaceFile('src/components/terminal/OnChainPanel.tsx', c => c.replace(/import { useEffect } from 'react'/g, '').replace(/\]\.map\(\(ri\) =>/g, '].map((_ri) =>'));
replaceFile('src/components/terminal/PortfolioPanel.tsx', c => c.replace(/const buyingPower = /g, 'const _buyingPower = ').replace(/const isInitialized = /g, 'const _isInitialized = '));
replaceFile('src/components/terminal/PositionLines.tsx', c => c.replace(/const _price = activeSymbol/g, 'const __price = activeSymbol').replace(/        \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n    }, \[activeSymbol, /g, '    }, [activeSymbol, ').replace(/    }, \[activeSymbol, /g, '        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [activeSymbol, '));
replaceFile('src/components/terminal/TradeExecution.tsx', c => c.replace(/} catch \(e\) {/g, '} catch (_e) {'));
replaceFile('src/components/terminal/TradeHistory.tsx', c => c.replace(/        \/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\n    }, \[tradeSyncId\]/g, '    }, [tradeSyncId]').replace(/    }, \[tradeSyncId\]/g, '        // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [tradeSyncId]'));
replaceFile('src/state/marketStore.ts', c => c.replace(/const equity = /g, 'const _equity = ').replace(/const totalUnrealizedPnl = /g, 'const _totalUnrealizedPnl = '));
