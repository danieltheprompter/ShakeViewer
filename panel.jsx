/* Desktop left panel — floating, translucent, no heavy borders */

const DesktopPanel = ({
  quakes, selectedId, onSelect,
  timeRange, onTimeRange,
  stats, loading,
  filters, selectedQuake,
  bookmarks, onBookmark, onShare,
  onCloseDetail,
  expanded, onToggleExpanded,
}) => {
  return React.createElement('aside', {
    className: `sv-panel ${expanded ? '' : 'collapsed'}`,
    'aria-label': 'Earthquakes and filters'
  },
    React.createElement('div', { className: 'sv-panel-inner' },
      selectedQuake
        ? React.createElement(QuakeDetail, {
            quake: selectedQuake, onClose: onCloseDetail,
            onBookmark, onShare,
            bookmarked: bookmarks.has(selectedQuake.id)
          })
        : React.createElement(React.Fragment, null,
            // Hero / stats band
            React.createElement('div', { className: 'sv-hero' },
              React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }
              },
                React.createElement('span', { className: 'label' }, 'Live feed · USGS'),
                React.createElement('span', {
                  className: 'mono',
                  style: { fontSize: 11, color: loading ? 'var(--fg-3)' : 'var(--accent)', display:'flex', alignItems:'center', gap: 6 }
                },
                  React.createElement('span', {
                    style: {
                      width: 6, height: 6, borderRadius: '50%',
                      background: loading ? 'var(--fg-3)' : 'var(--accent)',
                      boxShadow: loading ? 'none' : '0 0 8px var(--accent)',
                      animation: loading ? 'none' : 'sv-dot-pulse 1.6s ease-in-out infinite'
                    }
                  }),
                  loading ? 'Loading…' : 'Live'
                )
              ),
              React.createElement('div', { className: 'sv-stats' },
                React.createElement(Stat, { k: 'Events', v: loading ? '…' : stats.total }),
                React.createElement(Stat, { k: 'Largest', v: loading ? '…' : `M ${stats.maxMag}` }),
                React.createElement(Stat, { k: 'Sig. 4.5+', v: loading ? '…' : stats.significant }),
                React.createElement(Stat, { k: 'Felt', v: loading ? '…' : stats.felt })
              ),
            ),

            React.createElement('div', { className: 'hairline' }),

            // Filters — collapsible
            React.createElement(CollapsibleSection, { label: 'Filters', icon: 'filter', defaultOpen: true },
              React.createElement(FilterPanel, filters)
            ),

            React.createElement('div', { className: 'hairline' }),

            // List header
            React.createElement('div', { className: 'sv-list-header' },
              React.createElement('span', { className: 'label' },
                timeRange === 'custom' ? `${quakes.length} results` : 'Recent activity'
              ),
              loading && React.createElement('span', {
                className: 'mono', style: { fontSize: 11, color: 'var(--fg-3)' }
              }, 'refreshing…')
            ),

            // List
            React.createElement('div', { className: 'sv-list-scroll' },
              React.createElement(QuakeList, {
                quakes, selectedId, onSelect,
                bookmarks, onBookmark, onShare
              })
            )
          )
    ),
    // Collapse/expand handle
    React.createElement('button', {
      className: 'sv-panel-handle',
      onClick: onToggleExpanded,
      title: expanded ? 'Collapse' : 'Expand',
      'aria-label': expanded ? 'Collapse panel' : 'Expand panel'
    },
      React.createElement(SvIcon, { name: expanded ? 'chevron-left' : 'chevron-right', size: 14 })
    )
  );
};

const Stat = ({ k, v }) => React.createElement('div', { className: 'sv-stat' },
  React.createElement('div', { className: 'mono', style: { fontSize: 22, color: 'var(--fg-0)', fontWeight: 500, letterSpacing: '-0.01em' } }, v),
  React.createElement('div', { className: 'label', style: { fontSize: 9.5, marginTop: 2 } }, k)
);

const CollapsibleSection = ({ label, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return React.createElement('div', { className: 'sv-collapsible' },
    React.createElement('button', {
      className: 'sv-collapsible-header',
      onClick: () => setOpen(!open),
      'aria-expanded': open,
    },
      React.createElement('span', { style: { display:'flex', alignItems:'center', gap: 8 } },
        icon && React.createElement(SvIcon, { name: icon, size: 14, style:{ color:'var(--fg-2)' } }),
        React.createElement('span', { className: 'label' }, label)
      ),
      React.createElement(SvIcon, { name: open ? 'chevron-up' : 'chevron-down', size: 14, style:{ color: 'var(--fg-2)' } })
    ),
    open && React.createElement('div', { className: 'sv-collapsible-body' }, children)
  );
};

window.DesktopPanel = DesktopPanel;
window.CollapsibleSection = CollapsibleSection;
