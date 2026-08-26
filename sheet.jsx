/* Mobile bottom sheet — peek/half/full snap points, drag to resize */

const SNAPS = {
  peek: 110,   // just header + top row visible
  half: 0.55,  // 55% of viewport
  full: 0.92,
};

const snapPx = (snap, vh) => typeof SNAPS[snap] === 'number' && SNAPS[snap] > 1
  ? SNAPS[snap]
  : Math.round(vh * SNAPS[snap]);

const MobileSheet = ({
  snap, onSnap,
  quakes, selectedId, onSelect,
  timeRange, onTimeRange,
  stats, loading,
  filters,
  selectedQuake,
  bookmarks, onBookmark, onShare,
  onCloseDetail,
  filtersOpen, onCloseFilters,
}) => {
  const ref = React.useRef(null);
  const dragState = React.useRef(null);
  const [vh, setVh] = React.useState(window.innerHeight);
  const [dragY, setDragY] = React.useState(null);

  React.useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const height = dragY != null ? dragY : snapPx(snap, vh);

  const onPointerDown = (e) => {
    dragState.current = { y0: e.clientY, h0: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragState.current) return;
    const dy = dragState.current.y0 - e.clientY;
    const h = Math.max(90, Math.min(vh * 0.95, dragState.current.h0 + dy));
    setDragY(h);
  };
  const onPointerUp = (e) => {
    if (!dragState.current) return;
    const h = dragY ?? height;
    dragState.current = null;
    setDragY(null);
    // Snap to closest
    const options = [['peek', snapPx('peek', vh)], ['half', snapPx('half', vh)], ['full', snapPx('full', vh)]];
    let best = options[0], bestDist = Infinity;
    options.forEach(o => {
      const d = Math.abs(o[1] - h);
      if (d < bestDist) { bestDist = d; best = o; }
    });
    onSnap(best[0]);
  };

  const openCustom = timeRange === 'custom';

  return React.createElement('div', {
    ref,
    className: 'sv-sheet',
    style: {
      height: `${height}px`,
      transition: dragY != null ? 'none' : 'height 0.32s cubic-bezier(.4, .0, .2, 1)',
    },
    role: 'dialog', 'aria-modal': 'false'
  },
    // Drag grip
    React.createElement('div', {
      className: 'sv-sheet-grip',
      onPointerDown, onPointerMove, onPointerUp,
      onClick: () => {
        if (snap === 'peek') onSnap('half');
        else if (snap === 'half') onSnap('full');
        else onSnap('peek');
      }
    }, React.createElement('div', { className: 'sv-sheet-grip-bar' })),

    // Content
    React.createElement('div', { className: 'sv-sheet-body' },
      filtersOpen
        ? React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'sv-sheet-header' },
              React.createElement('h3', { className: 'display', style: { fontSize: 22, margin: 0 } }, 'Filters'),
              React.createElement('button', {
                className: 'sv-btn', onClick: onCloseFilters, style: { padding: 8 }, 'aria-label':'Close'
              }, React.createElement(SvIcon, { name: 'close', size: 18 }))
            ),
            // Time range for mobile goes here
            React.createElement('div', { style:{ padding:'8px 20px 16px' } },
              React.createElement('div', { className: 'label', style: { marginBottom: 6 } }, 'Time range'),
              React.createElement('div', { className: 'seg', style: { width:'100%' } },
                [['day','24 h'], ['week','7 d'], ['month','30 d'], ['custom','Custom']].map(([v,lbl]) =>
                  React.createElement('button', {
                    key: v,
                    className: timeRange === v ? 'on' : '',
                    onClick: () => onTimeRange(v),
                    style: { flex: 1 }
                  }, lbl)
                )
              )
            ),
            React.createElement(FilterPanel, filters)
          )
        : selectedQuake
        ? React.createElement(QuakeDetail, {
            quake: selectedQuake, onClose: onCloseDetail,
            onBookmark, onShare,
            bookmarked: bookmarks.has(selectedQuake.id)
          })
        : React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'sv-sheet-header' },
              React.createElement('div', null,
                React.createElement('div', { className: 'label' }, 'Live feed'),
                React.createElement('h3', {
                  className: 'display',
                  style: { fontSize: 22, margin: '2px 0 0', lineHeight: 1 }
                }, `${stats.total} events · M ${stats.maxMag} peak`)
              ),
              React.createElement('div', { className:'seg' },
                [['day','24h'], ['week','7d'], ['month','30d']].map(([v,l]) =>
                  React.createElement('button', {
                    key: v, className: timeRange === v ? 'on' : '',
                    onClick: () => onTimeRange(v)
                  }, l)
                )
              )
            ),

            React.createElement('div', { className: 'sv-list-scroll' },
              React.createElement(QuakeList, {
                quakes, selectedId, onSelect,
                bookmarks, onBookmark, onShare
              })
            )
          )
    )
  );
};

window.MobileSheet = MobileSheet;
