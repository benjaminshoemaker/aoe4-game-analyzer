import type { ClientHoverSnapshot, RenderPlayerLabels } from './postMatchHtml';

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function buildHoverInteractionScript(
  hoverSnapshots: ClientHoverSnapshot[],
  labels: RenderPlayerLabels,
  options: { includeAdjustedMilitary?: boolean } = {}
): string {
  const adjustedHelpers = options.includeAdjustedMilitary ? `
      function setAdjustedField(name, text) {
        setText('[data-adjusted-field="' + name + '"]', text);
      }

      function setAdjustedFieldHtml(name, html) {
        document.querySelectorAll('[data-adjusted-field="' + name + '"]').forEach(function (el) {
          el.innerHTML = html;
        });
      }

      function setFieldHtml(name, html) {
        document.querySelectorAll('[data-hover-field="' + name + '"]').forEach(function (el) {
          el.innerHTML = html;
        });
      }
` : '';
  const adjustedFormatters = options.includeAdjustedMilitary ? `
      function formatMultiplier(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) return 'n/a';
        return formatPrecise(numeric, 3) + 'x';
      }

      function adjustedPctText(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 'n/a';
        var rounded = Math.round(Number(value) * 10) / 10;
        var sign = rounded > 0 ? '+' : '';
        return sign + rounded.toFixed(1) + '%';
      }

      function matrixWhyHtmlFromCell(cell) {
        if (typeof cell.whyHtml === 'string' && cell.whyHtml.length > 0) {
          return cell.whyHtml;
        }
        return '<div class="adjusted-matrix-why-title">Select a matchup cell</div><p class="section-note adjusted-matrix-why-note">Click any matrix value to see that cell\\'s exact computation and explanation.</p>';
      }

      function adjustedMatrixHtml(point) {
        var matrix = point.adjustedMilitary && point.adjustedMilitary.matrix
          ? point.adjustedMilitary.matrix
          : null;
        if (!matrix) {
          return '<p class="section-note adjusted-matrix-note">Not enough military-active units to render the matchup matrix at this timestamp.</p>';
        }

        if (matrix.emptyMessage) {
          return '<p class="section-note adjusted-matrix-note">' + escapeHtml(matrix.emptyMessage) + '</p>';
        }

        var columns = Array.isArray(matrix.columns) ? matrix.columns : [];
        var rows = Array.isArray(matrix.rows) ? matrix.rows : [];
        if (columns.length === 0 || rows.length === 0) {
          return '<p class="section-note adjusted-matrix-note">Not enough military-active units to render the matchup matrix at this timestamp.</p>';
        }

        var header = '<tr><th>Unit</th>' + columns.map(function (unitName) {
          return '<th>' + escapeHtml(unitName) + '</th>';
        }).join('') + '</tr>';

        var body = rows.map(function (row) {
          var cells = (row.cells || []).map(function (cell) {
            var whyHtml = matrixWhyHtmlFromCell(cell);
            return '<td class="adjusted-matrix-cell"><button type="button" class="adjusted-matrix-cell-btn ' + escapeHtml(cell.heatClass || 'is-even') + '"' +
              ' data-matrix-why-html="' + escapeHtml(whyHtml) + '"' +
              '>' + formatPrecise(cell.score, 2) + 'x</button></td>';
          }).join('');
          return '<tr><th>' + escapeHtml(row.unitName || '') + '</th>' + cells + '</tr>';
        }).join('');

        var defaultWhy = typeof matrix.defaultWhyHtml === 'string' && matrix.defaultWhyHtml.length > 0
          ? matrix.defaultWhyHtml
          : '<div class="adjusted-matrix-why-title">Select a matchup cell</div><p class="section-note adjusted-matrix-why-note">Click any matrix value to see that cell\\'s exact computation and explanation.</p>';
        var matrixNote = typeof matrix.note === 'string' && matrix.note.length > 0
          ? matrix.note
          : 'Rows are your top military units. Columns are opponent top military units. Each cell is a direct pairwise interaction.';

        return '<p class="section-note adjusted-matrix-note">' + escapeHtml(matrixNote) + '</p>' +
          '<table class="adjusted-matrix-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>' +
          '<div class="adjusted-matrix-why" data-adjusted-field="matrixWhy">' + defaultWhy + '</div>';
      }

      function wireAdjustedMatrixInteractions() {
        var container = document.querySelector('[data-adjusted-field="matrixMock"]');
        if (!container) return;
        var buttons = container.querySelectorAll('.adjusted-matrix-cell-btn');
        if (!buttons || buttons.length === 0) return;

        function applyFromButton(button) {
          var whyHtml = button.getAttribute('data-matrix-why-html') || '';
          if (whyHtml) {
            setAdjustedFieldHtml('matrixWhy', whyHtml);
          }
          buttons.forEach(function (btn) {
            btn.classList.remove('is-selected');
          });
          button.classList.add('is-selected');
        }

        buttons.forEach(function (button) {
          button.addEventListener('click', function () {
            applyFromButton(button);
          });
        });

        applyFromButton(buttons[0]);
      }
` : '';
  const adjustedUpdate = options.includeAdjustedMilitary ? `
        var adjustedMilitary = point.adjustedMilitary || {};
        setFieldHtml('adjustedMilitary.you', '<span class="inspector-adjusted-value-main">' + formatNumber(adjustedMilitary.you) + '</span><small class="inspector-adjusted-value-pct">(' + adjustedPctText(adjustedMilitary.youPct) + ')</small>');
        setFieldHtml('adjustedMilitary.opponent', '<span class="inspector-adjusted-value-main">' + formatNumber(adjustedMilitary.opponent) + '</span><small class="inspector-adjusted-value-pct">(' + adjustedPctText(adjustedMilitary.opponentPct) + ')</small>');
        setField('adjustedMilitary.delta', formatSigned(adjustedMilitary.delta));
        setAdjustedField('timeLabel', point.timeLabel);
        setAdjustedField('you.raw', formatNumber(adjustedMilitary.youRaw));
        setAdjustedField('you.counterMultiplier', formatMultiplier(adjustedMilitary.youCounterMultiplier));
        setAdjustedField('you.counterAdjusted', formatPrecise(adjustedMilitary.youCounterAdjusted, 2));
        setAdjustedField('you.upgradeMultiplier', formatMultiplier(adjustedMilitary.youUpgradeMultiplier));
        setAdjustedField('you.final', formatNumber(adjustedMilitary.you));
        setAdjustedField(
          'you.formula',
          'You: ' + formatNumber(adjustedMilitary.youRaw) + ' × ' +
          formatMultiplier(adjustedMilitary.youCounterMultiplier) + ' × ' +
          formatMultiplier(adjustedMilitary.youUpgradeMultiplier) + ' = ' +
          formatNumber(adjustedMilitary.you)
        );
        setAdjustedField('opponent.raw', formatNumber(adjustedMilitary.opponentRaw));
        setAdjustedField('opponent.counterMultiplier', formatMultiplier(adjustedMilitary.opponentCounterMultiplier));
        setAdjustedField('opponent.counterAdjusted', formatPrecise(adjustedMilitary.opponentCounterAdjusted, 2));
        setAdjustedField('opponent.upgradeMultiplier', formatMultiplier(adjustedMilitary.opponentUpgradeMultiplier));
        setAdjustedField('opponent.final', formatNumber(adjustedMilitary.opponent));
        setAdjustedField(
          'opponent.formula',
          'Opponent: ' + formatNumber(adjustedMilitary.opponentRaw) + ' × ' +
          formatMultiplier(adjustedMilitary.opponentCounterMultiplier) + ' × ' +
          formatMultiplier(adjustedMilitary.opponentUpgradeMultiplier) + ' = ' +
          formatNumber(adjustedMilitary.opponent)
        );
        setAdjustedFieldHtml('matrixMock', adjustedMatrixHtml(point));
        wireAdjustedMatrixInteractions();
` : '';
  const inspectorContextUpdate = options.includeAdjustedMilitary ? `
          var markerText = point.markers && point.markers.length > 0 ? point.markers.join(' · ') : '';
          contextEl.textContent = pinned
            ? (markerText ? 'Pinned · ' + markerText + ' · Esc to clear' : 'Pinned · Esc to clear')
            : (markerText || 'Click to pin · Esc to clear');
` : `
          contextEl.textContent = mobileContext(point);
`;

  return `
  <script id="post-match-hover-data" type="application/json">${escapeJsonForScript(hoverSnapshots)}</script>
  <script>
    (function () {
      var payloadEl = document.getElementById('post-match-hover-data');
      if (!payloadEl || !payloadEl.textContent) return;

      var hoverData = [];
      var byTimestamp = new Map();
      var pinned = false;
      var selectedBand = 'economic';
      var selectedEconomicRoleFilter = '';
      var selectedInvestmentCategory = '';
      var currentTimestamp = null;
      var scheduledTimestamp = null;
      var framePending = false;
      var playerLabels = ${escapeJsonForScript({
        you: labels.you.compactShortLabel,
        opponent: labels.opponent.compactShortLabel,
      })};
      var bandLabels = {
        economic: 'Economic',
        populationCap: 'Population cap',
        militaryCapacity: 'Military buildings',
        militaryActive: 'Mil active',
        defensive: 'Defensive',
        research: 'Research',
        advancement: 'Advancement',
        destroyed: 'Destroyed',
        economicDestroyed: 'Economic destroyed',
        technologyDestroyed: 'Advancement destroyed',
        militaryDestroyed: 'Military destroyed',
        otherDestroyed: 'Other destroyed',
        float: 'Float',
        opportunityLost: 'Opportunity lost'
      };
      var economicRoleFilterLabels = {
        resourceGenerator: 'Resource generation',
        resourceInfrastructure: 'Resource infrastructure'
      };
      var economicRoleBasisMap = {
        resourceGenerator: 'resourceGeneration',
        resourceInfrastructure: 'resourceInfrastructure'
      };
      var opportunityLostCategoryDefs = [
        { key: 'villagers-lost', label: 'Villagers lost' },
        { key: 'villager-underproduction', label: 'Villager underproduction' }
      ];
      var investmentCategoryLabels = {
        economic: 'Total Economic Investment',
        technology: 'Total Technology Investment',
        military: 'Total Military Investment',
        other: 'Total Other Investment'
      };
      var investmentCategoryBandKeys = {
        economic: ['economic'],
        technology: ['research', 'advancement'],
        military: ['militaryCapacity', 'militaryActive', 'defensive'],
        other: ['populationCap']
      };
      var investmentCategoryDestroyedKeys = {
        economic: 'economicDestroyed',
        technology: 'technologyDestroyed',
        military: 'militaryDestroyed',
        other: 'otherDestroyed'
      };
      var categoryDestroyedBandMap = {
        economicDestroyed: 'economic',
        technologyDestroyed: 'technology',
        militaryDestroyed: 'military',
        otherDestroyed: 'other'
      };
      var allocationGraphDefs = {
        economic: { label: 'Economic', mode: 'share' },
        technology: { label: 'Technology', mode: 'share' },
        military: { label: 'Military', mode: 'share' },
        destroyed: { label: 'Destroyed', mode: 'absolute' },
        overall: { label: 'Overall', mode: 'absolute' },
        float: { label: 'Float', mode: 'absolute' },
        opportunityLost: { label: 'Opportunity lost', mode: 'absolute' }
      };

      function trackAnalyticsEvent(eventName, properties) {
        if (!window.aoe4Analytics || typeof window.aoe4Analytics.capture !== 'function') return;
        window.aoe4Analytics.capture(eventName, properties || {});
      }

      function safePointIndex(index) {
        if (hoverData.length === 0) return 0;
        return Math.max(0, Math.min(hoverData.length - 1, Number(index) || 0));
      }

      function analyticsPointProperties(point, source) {
        var event = point && point.significantEvent ? point.significantEvent : null;
        return {
          timestamp: point ? point.timestamp : null,
          time_label: point ? point.timeLabel : '',
          source: source || 'unknown',
          has_significant_event: !!event,
          significant_event_id: event ? event.id || '' : '',
          significant_event_kind: event ? event.kind || '' : ''
        };
      }

      function compactText(value) {
        return String(value || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
      }

      function outboundLinkProperties(link, linkKind) {
        var destinationHost = '';
        var destinationPath = '';
        try {
          var url = new URL(link.href, window.location.href);
          destinationHost = url.hostname;
          destinationPath = url.pathname;
        } catch (_error) {}
        return {
          link_kind: linkKind || 'external',
          destination_host: destinationHost,
          destination_path: destinationPath,
          link_text: compactText(link.textContent),
          timestamp: currentTimestamp
        };
      }

      function trackMobileTimelineChanged(point, source, targetIndex, extraProperties) {
        var properties = Object.assign(
          analyticsPointProperties(point, source),
          {
            target_index: targetIndex
          },
          extraProperties || {}
        );
        trackAnalyticsEvent('mobile timeline changed', properties);
      }

      function formatNumber(value) {
        return Math.round(Number(value) || 0).toLocaleString('en-US');
      }

      function formatSigned(value) {
        var rounded = Math.round(Number(value) || 0);
        return rounded > 0 ? '+' + rounded.toLocaleString('en-US') : rounded.toLocaleString('en-US');
      }

      function formatSeconds(value) {
        return formatNumber(value) + 's';
      }

      function formatSignedSeconds(value) {
        return formatSigned(value) + 's';
      }

      function formatPrecise(value, decimals) {
        var digits = Number.isFinite(decimals) ? decimals : 2;
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) return 'n/a';
        return numeric.toLocaleString('en-US', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        });
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function labelX(x) {
        return x > 810 ? x - 8 : x + 8;
      }

      function labelAnchor(x) {
        return x > 810 ? 'end' : 'start';
      }

      function replaceTimestampInUrl(timestamp) {
        try {
          var url = new URL(window.location.href);
          if (timestamp === null || timestamp === undefined || Number.isNaN(Number(timestamp))) {
            url.searchParams.delete('t');
          } else {
            url.searchParams.set('t', String(Math.max(0, Math.round(Number(timestamp)))));
          }
          var nextHref = url.pathname + (url.search || '') + (url.hash || '');
          window.history.replaceState({}, '', nextHref);
        } catch (_error) {
          // no-op on malformed browser URL parsing
        }
      }

      function requestedTimestampFromUrl() {
        try {
          var url = new URL(window.location.href);
          if (!url.searchParams.has('t')) return null;
          var value = Number(url.searchParams.get('t'));
          return Number.isFinite(value) ? value : null;
        } catch (_error) {
          return null;
        }
      }

      function nearestTimestamp(target) {
        if (!Number.isFinite(target) || hoverData.length === 0) return null;
        var closest = hoverData[0].timestamp;
        var minDistance = Math.abs(target - closest);
        for (var idx = 1; idx < hoverData.length; idx += 1) {
          var timestamp = Number(hoverData[idx].timestamp);
          var distance = Math.abs(target - timestamp);
          if (distance < minDistance) {
            closest = timestamp;
            minDistance = distance;
          }
        }
        return closest;
      }

      function setHoverData(nextHoverData) {
        hoverData = Array.isArray(nextHoverData) ? nextHoverData : [];
        byTimestamp = new Map(hoverData.map(function (point) { return [String(point.timestamp), point]; }));
        currentTimestamp = hoverData[0] ? hoverData[0].timestamp : null;
      }

      function pointIndexForTimestamp(timestamp) {
        for (var idx = 0; idx < hoverData.length; idx += 1) {
          if (String(hoverData[idx].timestamp) === String(timestamp)) return idx;
        }
        return 0;
      }

      function setText(selector, text) {
        document.querySelectorAll(selector).forEach(function (el) {
          el.textContent = text;
        });
      }

      function setField(name, text) {
        setText('[data-hover-field="' + name + '"]', text);
      }
${adjustedHelpers}

      function setTitle(selector, text) {
        document.querySelectorAll(selector).forEach(function (el) {
          el.setAttribute('title', text);
        });
      }

      function mobileContext(point) {
        return point.markers && point.markers.length > 0
          ? point.markers.join(' · ')
          : 'Use the slider or step buttons to inspect a timestamp.';
      }

      function setMobileSummary(key, row) {
        var safeRow = row || { you: 0, opponent: 0, delta: 0 };
        setText('[data-mobile-summary-value="' + key + '"]', formatSigned(safeRow.delta));
        setText(
          '[data-mobile-summary-detail="' + key + '"]',
          playerLabels.you + ' ' + formatNumber(safeRow.you) + ' · ' + playerLabels.opponent + ' ' + formatNumber(safeRow.opponent)
        );
      }

      function syncMobileTimeline(point) {
        var currentIndex = pointIndexForTimestamp(point.timestamp);
        var maxIndex = Math.max(0, hoverData.length - 1);

        document.querySelectorAll('[data-mobile-timeline-slider]').forEach(function (slider) {
          slider.setAttribute('max', String(maxIndex));
          slider.value = String(currentIndex);
          slider.disabled = hoverData.length <= 1;
        });
        document.querySelectorAll('[data-mobile-timeline-step]').forEach(function (button) {
          var step = Number(button.getAttribute('data-mobile-timeline-step') || 0);
          button.disabled = hoverData.length <= 1 ||
            (step < 0 && currentIndex <= 0) ||
            (step > 0 && currentIndex >= maxIndex);
        });

        setText('[data-mobile-current-time]', point.timeLabel);
        setText('[data-mobile-current-context]', mobileContext(point));
        var allocation = point.allocation || {};
        setMobileSummary('overall', allocation.overall);
        setMobileSummary('technology', allocation.technology);
        setMobileSummary('military', allocation.military);
        setMobileSummary('destroyed', allocation.destroyed);
      }

      function setSvgLabel(selector, x, text) {
        document.querySelectorAll(selector).forEach(function (el) {
          if (!el.hasAttribute('data-fixed-label')) {
            el.setAttribute('x', String(labelX(x)));
            el.setAttribute('text-anchor', labelAnchor(x));
          }
          el.textContent = text;
        });
      }

      function setVerticalLine(selector, x) {
        document.querySelectorAll(selector).forEach(function (line) {
          line.setAttribute('x1', String(x));
          line.setAttribute('x2', String(x));
        });
      }

      function renderBandBreakdown(point) {
        var bandData = point.bandBreakdown && point.bandBreakdown[selectedBand]
          ? point.bandBreakdown[selectedBand]
          : { you: [], opponent: [] };
        var filteredBandData = bandData;
        if (selectedInvestmentCategory) {
          filteredBandData = combinedInvestmentBreakdown(point, selectedInvestmentCategory);
        } else if (selectedBand === 'economic' && selectedEconomicRoleFilter) {
          filteredBandData = {
            you: bandData.you.filter(function (entry) {
              return (entry.economicRole || 'resourceInfrastructure') === selectedEconomicRoleFilter;
            }),
            opponent: bandData.opponent.filter(function (entry) {
              return (entry.economicRole || 'resourceInfrastructure') === selectedEconomicRoleFilter;
            })
          };
        }
        var bandLabel = selectedInvestmentCategory
          ? investmentCategoryLabels[selectedInvestmentCategory] || selectedInvestmentCategory
          : selectedBand === 'economic' && selectedEconomicRoleFilter
          ? economicRoleFilterLabels[selectedEconomicRoleFilter] || bandLabels[selectedBand] || selectedBand
          : bandLabels[selectedBand] || selectedBand;
        var destroyedCategory = categoryDestroyedBandMap[selectedBand];
        var economicRoleBasis = selectedBand === 'economic' && selectedEconomicRoleFilter
          ? economicRoleBasisMap[selectedEconomicRoleFilter]
          : '';
        var selectedValues = selectedInvestmentCategory && point.allocationCategory && point.allocationCategory[selectedInvestmentCategory]
          ? point.allocationCategory[selectedInvestmentCategory].investment
          : economicRoleBasis && point.allocationCategory && point.allocationCategory.economic && point.allocationCategory.economic[economicRoleBasis]
          ? point.allocationCategory.economic[economicRoleBasis]
          : destroyedCategory
          ? ((point.allocationCategory &&
              point.allocationCategory[destroyedCategory] &&
              point.allocationCategory[destroyedCategory].destroyed) ||
              { you: 0, opponent: 0, delta: 0 })
          : selectedBand === 'destroyed' || selectedBand === 'float' || selectedBand === 'opportunityLost'
            ? ((point.allocation && point.allocation[selectedBand]) || { you: 0, opponent: 0, delta: 0 })
            : {
                you: point.you && Number.isFinite(Number(point.you[selectedBand])) ? Number(point.you[selectedBand]) : 0,
                opponent: point.opponent && Number.isFinite(Number(point.opponent[selectedBand])) ? Number(point.opponent[selectedBand]) : 0,
                delta: point.delta && Number.isFinite(Number(point.delta[selectedBand])) ? Number(point.delta[selectedBand]) : 0
              };

        var titleEl = document.querySelector('[data-band-breakdown-title]');
        if (titleEl) {
          titleEl.textContent = selectedBand === 'opportunityLost'
            ? 'Opportunity lost: resources lost by selected time'
            : bandLabel + ' composition';
        }
        setText('[data-band-summary-label]', bandLabel);
        setText('[data-band-summary-you]', formatNumber(selectedValues.you));
        setText('[data-band-summary-opponent]', formatNumber(selectedValues.opponent));
        setText('[data-band-summary-delta]', formatSigned(selectedValues.delta));
        document.querySelectorAll('[data-band-summary-value]').forEach(function (el) {
          el.hidden = selectedBand === 'opportunityLost';
        });
        document.querySelectorAll('[data-opportunity-lost-components]').forEach(function (el) {
          el.hidden = selectedBand !== 'opportunityLost';
        });
        var opportunityComponents = point.opportunityLostComponents || {};
        var opportunityTotal = (point.allocation && point.allocation.opportunityLost) || { you: 0, opponent: 0, delta: 0 };
        var villagersLost = opportunityComponents.villagersLost || { you: 0, opponent: 0, delta: 0 };
        var underproduction = opportunityComponents.underproduction || { you: 0, opponent: 0, delta: 0 };
        var gatherDisruption = opportunityComponents.gatherDisruption || { you: 0, opponent: 0, delta: 0 };
        var lowUnderproduction = opportunityComponents.lowUnderproduction || { you: 0, opponent: 0, delta: 0 };
        setText('[data-opportunity-lost-component-total-you]', formatNumber(opportunityTotal.you));
        setText('[data-opportunity-lost-component-total-opponent]', formatNumber(opportunityTotal.opponent));
        setText('[data-opportunity-lost-component-total-delta]', formatSigned(opportunityTotal.delta));
        setText('[data-opportunity-lost-component-villagers-lost-you]', formatNumber(villagersLost.you));
        setText('[data-opportunity-lost-component-villagers-lost-opponent]', formatNumber(villagersLost.opponent));
        setText('[data-opportunity-lost-component-villagers-lost-delta]', formatSigned(villagersLost.delta));
        setText('[data-opportunity-lost-component-underproduction-you]', formatNumber(underproduction.you));
        setText('[data-opportunity-lost-component-underproduction-opponent]', formatNumber(underproduction.opponent));
        setText('[data-opportunity-lost-component-underproduction-delta]', formatSigned(underproduction.delta));
        setText('[data-opportunity-lost-component-gather-disruption-you]', formatNumber(gatherDisruption.you));
        setText('[data-opportunity-lost-component-gather-disruption-opponent]', formatNumber(gatherDisruption.opponent));
        setText('[data-opportunity-lost-component-gather-disruption-delta]', formatSigned(gatherDisruption.delta));
        setText('[data-opportunity-lost-component-low-underproduction-you]', formatSeconds(lowUnderproduction.you));
        setText('[data-opportunity-lost-component-low-underproduction-opponent]', formatSeconds(lowUnderproduction.opponent));
        setText('[data-opportunity-lost-component-low-underproduction-delta]', formatSignedSeconds(lowUnderproduction.delta));

        function listHtml(entries, bandKey) {
          if (!entries || entries.length === 0) {
            return bandKey === 'opportunityLost'
              ? '<li class="band-breakdown-empty">No villager deaths</li>'
              : '<li class="band-breakdown-empty">No active items</li>';
          }

          function opportunityLostCategoryKey(entry) {
            if (entry.category === 'villager-underproduction') return 'villager-underproduction';
            return 'villagers-lost';
          }

          function displayLabel(entry) {
            var count = Number(entry.count);
            return entry.label + (Number.isFinite(count) && count > 0 ? ' (' + formatNumber(count) + ')' : '');
          }

          function breakdownEntryHtml(entry) {
            var label = displayLabel(entry);
            return '<li><span class="band-item-label band-item-label-truncated" title="' + escapeHtml(label) + '" tabindex="0">' + escapeHtml(label) + '</span><span class="band-item-metric">' + formatNumber(entry.value) + '</span></li>';
          }

          if (bandKey === 'research') {
            var categoryDefs = [
              { key: 'military', label: 'Military research' },
              { key: 'economic', label: 'Economic research' },
              { key: 'other', label: 'Other research' }
            ];

            var grouped = categoryDefs.map(function (def) {
              var groupEntries = entries.filter(function (entry) {
                return (entry.category || 'other') === def.key;
              });
              if (groupEntries.length === 0) return '';
              var rows = groupEntries.map(function (entry) {
                return breakdownEntryHtml(entry);
              }).join('');
              return '<li class="band-breakdown-group">' + escapeHtml(def.label) + '</li>' + rows;
            }).join('');

            if (grouped.length > 0) return grouped;
          }

          if (bandKey === 'opportunityLost') {
            var opportunityGroups = opportunityLostCategoryDefs.map(function (def) {
              var groupEntries = entries.filter(function (entry) {
                return opportunityLostCategoryKey(entry) === def.key;
              });
              if (groupEntries.length === 0) return '';
              var rows = groupEntries.map(function (entry) {
                return breakdownEntryHtml(entry);
              }).join('');
              return '<li class="band-breakdown-group">' + escapeHtml(def.label) + '</li>' + rows;
            }).join('');

            if (opportunityGroups.length > 0) return opportunityGroups;
          }

          return entries.map(function (entry) {
            return breakdownEntryHtml(entry);
          }).join('');
        }

        var youList = document.querySelector('[data-band-breakdown-list="you"]');
        var oppList = document.querySelector('[data-band-breakdown-list="opponent"]');
        if (youList) youList.innerHTML = listHtml(filteredBandData.you, selectedBand);
        if (oppList) oppList.innerHTML = listHtml(filteredBandData.opponent, selectedBand);
      }

      function combinedInvestmentBreakdown(point, category) {
        function entriesFor(side) {
          var entries = [];
          var bandKeys = investmentCategoryBandKeys[category] || [];
          bandKeys.forEach(function (bandKey) {
            var data = point.bandBreakdown && point.bandBreakdown[bandKey];
            if (data && Array.isArray(data[side])) {
              entries = entries.concat(data[side]);
            }
          });

          var destroyedKey = investmentCategoryDestroyedKeys[category];
          var destroyedData = destroyedKey && point.bandBreakdown && point.bandBreakdown[destroyedKey];
          if (destroyedData && Array.isArray(destroyedData[side])) {
            entries = entries.concat(destroyedData[side].map(function (entry) {
              return Object.assign({}, entry, {
                label: 'Destroyed ' + entry.label
              });
            }));
          }

          var total = entries.reduce(function (sum, entry) {
            return sum + Math.max(0, Number(entry.value) || 0);
          }, 0);

          return entries.map(function (entry) {
            var value = Math.max(0, Number(entry.value) || 0);
            return Object.assign({}, entry, {
              value: value,
              percent: total > 0 ? value / total * 100 : 0
            });
          });
        }

        return {
          you: entriesFor('you'),
          opponent: entriesFor('opponent')
        };
      }

      function syncBandSelection() {
        document.querySelectorAll('.band-toggle[data-band-key]').forEach(function (button) {
          var key = button.getAttribute('data-band-key');
          var roleFilter = button.getAttribute('data-economic-role-filter') || '';
          var investmentCategory = button.getAttribute('data-allocation-investment-category') || '';
          var isSelected = key === selectedBand &&
            roleFilter === selectedEconomicRoleFilter &&
            investmentCategory === selectedInvestmentCategory;
          button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          var row = button.closest('tr.band-row');
          if (row) {
            if (isSelected) row.classList.add('is-selected');
            else row.classList.remove('is-selected');
          }
        });
      }

      function setDestroyedTooltipOpen(button, isOpen) {
        button.setAttribute('data-tooltip-open', isOpen ? 'true' : 'false');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        var tooltipId = button.getAttribute('aria-controls') || '';
        var tooltip = tooltipId ? document.getElementById(tooltipId) : button.querySelector('.destroyed-row-tooltip');
        if (tooltip) tooltip.hidden = !isOpen;
      }

      function closeDestroyedTooltips(exceptButton) {
        document.querySelectorAll('[data-destroyed-help-button]').forEach(function (button) {
          if (button === exceptButton) return;
          setDestroyedTooltipOpen(button, false);
        });
      }

      function toggleDestroyedTooltip(button) {
        var shouldOpen = button.getAttribute('data-tooltip-open') !== 'true';
        closeDestroyedTooltips(button);
        setDestroyedTooltipOpen(button, shouldOpen);
      }

      function isCategoryCollapsed(category) {
        var button = document.querySelector('[data-allocation-category-toggle="' + category + '"]');
        return !!button && button.getAttribute('aria-expanded') === 'false';
      }

      function syncDestroyedRowVisibility(point) {
        ['economic', 'technology', 'military', 'other'].forEach(function (category) {
          var destroyedRow = point.allocationCategory &&
            point.allocationCategory[category] &&
            point.allocationCategory[category].destroyed
            ? point.allocationCategory[category].destroyed
            : { you: 0, opponent: 0 };
          var isEmpty = Math.max(0, Number(destroyedRow.you) || 0) <= 0 &&
            Math.max(0, Number(destroyedRow.opponent) || 0) <= 0;
          document.querySelectorAll('[data-destroyed-row-category="' + category + '"]').forEach(function (row) {
            row.setAttribute('data-destroyed-row-empty', isEmpty ? 'true' : 'false');
            row.hidden = isCategoryCollapsed(category) || isEmpty;
          });
        });
      }

      function setCategoryCollapsed(key, collapsed) {
        document.querySelectorAll('[data-allocation-category-child="' + key + '"]').forEach(function (row) {
          var isEmptyDestroyed = row.getAttribute('data-destroyed-row-empty') === 'true';
          row.hidden = collapsed || isEmptyDestroyed;
        });
        document.querySelectorAll('[data-allocation-category-toggle="' + key + '"]').forEach(function (button) {
          button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
      }

      function formatStrategyShare(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) numeric = 0;
        return numeric.toFixed(1) + '%';
      }

      function formatSignedPercentagePoints(value) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) numeric = 0;
        var rounded = Math.round(numeric * 10) / 10;
        if (Object.is(rounded, -0)) rounded = 0;
        var sign = rounded > 0 ? '+' : '';
        return sign + rounded.toFixed(1) + 'pp';
      }
${adjustedFormatters}

      function significantEventLossNameHtml(item) {
        var label = item && item.label ? item.label : 'Loss';
        var count = Number(item && item.count || 0);
        var countLabel = item && item.showCount === false || count <= 0
          ? ''
          : ' <span class="event-impact-item-count">x' + formatNumber(count) + '</span>';
        var detail = item && item.detail ? '<small class="event-impact-loss-note">' + escapeHtml(item.detail) + '</small>' : '';
        var helpButton = item && item.title
          ? '<button type="button" class="event-impact-help-button event-impact-inline-help-button" data-significant-event-loss-row-help aria-label="What is ' + escapeHtml(label) + '?" title="' + escapeHtml(item.title) + '">?</button>'
          : '';
        return escapeHtml(label) + countLabel + helpButton + detail;
      }

      function significantEventLossTableRowsHtml(player1Items, player2Items) {
        var left = Array.isArray(player1Items) ? player1Items : [];
        var right = Array.isArray(player2Items) ? player2Items : [];
        var rowCount = Math.max(left.length, right.length, 1);
        var player1EmptyRendered = false;
        var player2EmptyRendered = false;
        var rows = [];
        for (var index = 0; index < rowCount; index += 1) {
          var player1Item = left[index];
          var player2Item = right[index];
          var player1Cells = player1Item
            ? '<td class="event-impact-loss-name">' + significantEventLossNameHtml(player1Item) + '</td>' +
              '<td class="event-impact-loss-value">' + formatNumber(player1Item.value || 0) + '</td>'
            : !player1EmptyRendered
              ? '<td class="event-impact-loss-empty-side event-impact-loss-empty-side-player1" colspan="2" rowspan="' + (rowCount - index) + '">No losses</td>'
              : '';
          var player2Cells = player2Item
            ? '<td class="event-impact-loss-name">' + significantEventLossNameHtml(player2Item) + '</td>' +
              '<td class="event-impact-loss-value">' + formatNumber(player2Item.value || 0) + '</td>'
            : !player2EmptyRendered
              ? '<td class="event-impact-loss-empty-side event-impact-loss-empty-side-player2" colspan="2" rowspan="' + (rowCount - index) + '">No losses</td>'
              : '';
          if (!player1Item) player1EmptyRendered = true;
          if (!player2Item) player2EmptyRendered = true;
          rows.push('<tr>' +
            player1Cells +
            player2Cells +
            '</tr>');
        }
        return rows.join('');
      }

      function significantEventArmyTableRowsHtml(items) {
        if (!Array.isArray(items) || items.length === 0) {
          return '<tr>' +
            '<td class="event-impact-loss-row-empty">No active military</td>' +
            '<td></td>' +
            '</tr>';
        }
        return items.map(function (item) {
          return '<tr>' +
            '<td class="event-impact-loss-name">' + significantEventLossNameHtml(item) + '</td>' +
            '<td class="event-impact-loss-value">' + formatNumber(item.value || 0) + '</td>' +
            '</tr>';
        }).join('');
      }

      function significantEventLossPill(event) {
        if (!event) return '';
        return formatNumber(significantEventDisplayedTotalLoss(event, 'player1')) +
          ' vs ' +
          formatNumber(significantEventDisplayedTotalLoss(event, 'player2'));
      }

      function significantEventArmyPill(event) {
        if (!event) return '';
        return 'Start ' +
          formatNumber(significantEventArmyValue(event, 'player1', 'start')) +
          ' / ' +
          formatNumber(significantEventArmyValue(event, 'player2', 'start')) +
          ' -> End ' +
          formatNumber(significantEventArmyValue(event, 'player1', 'end')) +
          ' / ' +
          formatNumber(significantEventArmyValue(event, 'player2', 'end'));
      }

      function significantEventArmyValue(event, playerKey, phase) {
        var armies = event && phase === 'end' ? event.postEncounterArmies : event && event.preEncounterArmies;
        var army = armies ? armies[playerKey] : null;
        return army && Number.isFinite(Number(army.totalValue)) ? Number(army.totalValue) : 0;
      }

      function updateSignificantEventUnderdog(event) {
        var context = event && event.favorableUnderdogFight ? event.favorableUnderdogFight : null;
        document.querySelectorAll('[data-significant-event-underdog-toggle]').forEach(function (el) {
          el.hidden = !context;
        });
        document.querySelectorAll('[data-significant-event-underdog-details]').forEach(function (el) {
          el.hidden = !context;
          if (!context) el.open = false;
        });
        document.querySelectorAll('[data-significant-event-underdog-details-text]').forEach(function (el) {
          el.textContent = context ? context.details || '' : '';
        });
      }

      function significantEventLossValue(event, playerKey, metric) {
        if (!event) return 0;
        var impact = event.playerImpacts ? event.playerImpacts[playerKey] : null;
        if (impact && Number.isFinite(Number(impact[metric]))) {
          return Number(impact[metric]);
        }
        if (metric === 'immediateLoss' || metric === 'grossLoss') {
          var losses = event.encounterLosses && Array.isArray(event.encounterLosses[playerKey])
            ? event.encounterLosses[playerKey]
            : [];
          return losses.reduce(function (sum, item) {
            return sum + Number(item.value || 0);
          }, 0);
        }
        return 0;
      }

      function significantEventGatherDisruption(event, playerKey) {
        var impact = event && event.playerImpacts ? event.playerImpacts[playerKey] : null;
        return impact && impact.gatherDisruption ? impact.gatherDisruption : null;
      }

      function significantEventDisplayedTotalLoss(event, playerKey) {
        var disruption = significantEventGatherDisruption(event, playerKey);
        return significantEventLossValue(event, playerKey, 'grossLoss') +
          (disruption ? Number(disruption.value || 0) : 0);
      }

      function significantEventDisplayedImmediateLoss(event, playerKey) {
        var disruption = significantEventGatherDisruption(event, playerKey);
        return significantEventLossValue(event, playerKey, 'immediateLoss') +
          (disruption ? Number(disruption.value || 0) : 0);
      }

      function significantEventDisplayedPctOfDeployed(event, playerKey) {
        var denominator = significantEventLossValue(event, playerKey, 'denominator');
        if (denominator <= 0) return 0;
        return (significantEventDisplayedTotalLoss(event, playerKey) / denominator) * 100;
      }

      function setSignificantLossSummaryText(attr, playerKey, value) {
        document.querySelectorAll('[data-significant-event-loss-' + attr + '="' + playerKey + '"]').forEach(function (el) {
          el.textContent = value;
        });
      }

      function updateSignificantEventLossSummary(event, playerKey) {
        var totalLoss = significantEventDisplayedTotalLoss(event, playerKey);
        var immediateLoss = significantEventDisplayedImmediateLoss(event, playerKey);
        var villagerOpportunityLoss = significantEventLossValue(event, playerKey, 'villagerOpportunityLoss');
        var pctOfDeployed = significantEventDisplayedPctOfDeployed(event, playerKey);
        setSignificantLossSummaryText('total', playerKey, event ? formatNumber(totalLoss) : '');
        setSignificantLossSummaryText('immediate', playerKey, event ? formatNumber(immediateLoss) : '');
        setSignificantLossSummaryText('villager-opportunity', playerKey, event ? formatNumber(villagerOpportunityLoss) : '');
        setSignificantLossSummaryText('share', playerKey, event ? formatPrecise(pctOfDeployed, 1) + '%' : '');
        document.querySelectorAll('[data-significant-event-loss-share-label="' + playerKey + '"]').forEach(function (el) {
          el.textContent = 'Share of Deployed Resources Lost';
        });
        document.querySelectorAll('[data-significant-event-loss-villager-opportunity-row="' + playerKey + '"]').forEach(function (el) {
          el.hidden = !event || villagerOpportunityLoss <= 0;
        });
        document.querySelectorAll('[data-significant-event-loss-pill]').forEach(function (el) {
          el.textContent = significantEventLossPill(event);
        });
      }

      function updateSignificantEventLosses(event) {
        var player1Label = event && (event.player1Label || event.player1Civilization) ? (event.player1Label || event.player1Civilization) : 'Player 1';
        var player2Label = event && (event.player2Label || event.player2Civilization) ? (event.player2Label || event.player2Civilization) : 'Player 2';
        document.querySelectorAll('[data-significant-event-loss-heading="player1"]').forEach(function (el) {
          el.textContent = player1Label + ' loss';
        });
        document.querySelectorAll('[data-significant-event-loss-heading="player2"]').forEach(function (el) {
          el.textContent = player2Label + ' loss';
        });
        document.querySelectorAll('[data-significant-event-loss-table]').forEach(function (el) {
          el.innerHTML = significantEventLossTableRowsHtml(
            event && event.encounterLosses ? event.encounterLosses.player1 : [],
            event && event.encounterLosses ? event.encounterLosses.player2 : []
          );
        });
        updateSignificantEventLossSummary(event, 'player1');
        updateSignificantEventLossSummary(event, 'player2');
        var player1OpportunityLoss = significantEventLossValue(event, 'player1', 'villagerOpportunityLoss');
        var player2OpportunityLoss = significantEventLossValue(event, 'player2', 'villagerOpportunityLoss');
        document.querySelectorAll('[data-significant-event-summary-villager-opportunity-row]').forEach(function (el) {
          el.hidden = !event || (player1OpportunityLoss <= 0 && player2OpportunityLoss <= 0);
        });
      }

      function updateSignificantEventArmies(event) {
        var showArmies = !!(event && event.kind === 'fight' && (event.preEncounterArmies || event.postEncounterArmies));
        var player1Label = event && (event.player1Label || event.player1Civilization) ? (event.player1Label || event.player1Civilization) : 'Player 1';
        var player2Label = event && (event.player2Label || event.player2Civilization) ? (event.player2Label || event.player2Civilization) : 'Player 2';
        document.querySelectorAll('[data-significant-event-armies]').forEach(function (el) {
          el.hidden = !showArmies;
        });
        document.querySelectorAll('[data-significant-event-summary-army-row]').forEach(function (el) {
          el.hidden = !showArmies;
        });
        document.querySelectorAll('[data-significant-event-summary-heading="player1"]').forEach(function (el) {
          el.textContent = player1Label;
        });
        document.querySelectorAll('[data-significant-event-summary-heading="player2"]').forEach(function (el) {
          el.textContent = player2Label;
        });
        document.querySelectorAll('[data-significant-event-army-heading="player1"]').forEach(function (el) {
          el.textContent = 'Window start: ' + player1Label;
        });
        document.querySelectorAll('[data-significant-event-army-heading="player2"]').forEach(function (el) {
          el.textContent = 'Window start: ' + player2Label;
        });
        document.querySelectorAll('[data-significant-event-army-end-heading="player1"]').forEach(function (el) {
          el.textContent = 'Window end: ' + player1Label;
        });
        document.querySelectorAll('[data-significant-event-army-end-heading="player2"]').forEach(function (el) {
          el.textContent = 'Window end: ' + player2Label;
        });
        document.querySelectorAll('[data-significant-event-army-total="player1"]').forEach(function (el) {
          el.textContent = event ? formatNumber(significantEventArmyValue(event, 'player1', 'start')) : '';
        });
        document.querySelectorAll('[data-significant-event-army-total="player2"]').forEach(function (el) {
          el.textContent = event ? formatNumber(significantEventArmyValue(event, 'player2', 'start')) : '';
        });
        document.querySelectorAll('[data-significant-event-army-end-total="player1"]').forEach(function (el) {
          el.textContent = event ? formatNumber(significantEventArmyValue(event, 'player1', 'end')) : '';
        });
        document.querySelectorAll('[data-significant-event-army-end-total="player2"]').forEach(function (el) {
          el.textContent = event ? formatNumber(significantEventArmyValue(event, 'player2', 'end')) : '';
        });
        document.querySelectorAll('[data-significant-event-army-pill]').forEach(function (el) {
          el.textContent = significantEventArmyPill(event);
        });
        document.querySelectorAll('[data-significant-event-army-list="player1"]').forEach(function (el) {
          el.innerHTML = significantEventArmyTableRowsHtml(event && event.preEncounterArmies ? event.preEncounterArmies.player1.units : []);
        });
        document.querySelectorAll('[data-significant-event-army-list="player2"]').forEach(function (el) {
          el.innerHTML = significantEventArmyTableRowsHtml(event && event.preEncounterArmies ? event.preEncounterArmies.player2.units : []);
        });
        document.querySelectorAll('[data-significant-event-army-end-list="player1"]').forEach(function (el) {
          el.innerHTML = significantEventArmyTableRowsHtml(event && event.postEncounterArmies ? event.postEncounterArmies.player1.units : []);
        });
        document.querySelectorAll('[data-significant-event-army-end-list="player2"]').forEach(function (el) {
          el.innerHTML = significantEventArmyTableRowsHtml(event && event.postEncounterArmies ? event.postEncounterArmies.player2.units : []);
        });
      }

      function syncSignificantEventWindowSpotlight(point) {
        var eventId = point && point.significantEvent && point.significantEvent.id
          ? String(point.significantEvent.id)
          : '';
        document.querySelectorAll('[data-significant-event-window]').forEach(function (el) {
          var isSelected = !!eventId && el.getAttribute('data-significant-event-id') === eventId;
          if (isSelected) {
            el.removeAttribute('display');
            el.setAttribute('aria-hidden', 'false');
          } else {
            el.setAttribute('display', 'none');
            el.setAttribute('aria-hidden', 'true');
          }
        });
      }

      function updateSignificantEvent(point) {
        var event = point.significantEvent || null;
        syncSignificantEventWindowSpotlight(point);
        document.querySelectorAll('[data-significant-event]').forEach(function (el) {
          el.hidden = !event;
        });
        if (!event) {
          setField('significantEvent.label', '');
          updateSignificantEventUnderdog(null);
          updateSignificantEventArmies(null);
          updateSignificantEventLosses(null);
          return;
        }

        setField('significantEvent.label', event.headline || ((event.victimLabel ? event.victimLabel + ' ' : '') + (event.label || 'Event')));
        updateSignificantEventUnderdog(event);
        updateSignificantEventArmies(event);
        updateSignificantEventLosses(event);
      }

      function updateInspector(timestamp) {
        var point = byTimestamp.get(String(timestamp));
        if (!point) return;
        currentTimestamp = point.timestamp;

        setField('timeLabel', point.timeLabel);
        var contextEl = document.querySelector('[data-hover-context]');
        if (contextEl) {
${inspectorContextUpdate}
        }
        updateSignificantEvent(point);

        ['economic', 'populationCap', 'militaryCapacity', 'militaryActive', 'defensive', 'research', 'advancement', 'total'].forEach(function (key) {
          setField('you.' + key, formatNumber(point.you[key]));
          setField('opponent.' + key, formatNumber(point.opponent[key]));
          setField('delta.' + key, formatSigned(point.delta[key]));
        });
        ['economic', 'technology', 'military', 'other', 'destroyed', 'overall', 'float', 'opportunityLost'].forEach(function (key) {
          var allocationRow = point.allocation && point.allocation[key]
            ? point.allocation[key]
            : { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 };
          setField('allocation.' + key + '.you', formatNumber(allocationRow.you));
          setField('allocation.' + key + '.opponent', formatNumber(allocationRow.opponent));
          setField('allocation.' + key + '.delta', formatSigned(allocationRow.delta));
        });
        ['economic', 'technology', 'military', 'other'].forEach(function (categoryKey) {
          var basisKeys = categoryKey === 'economic'
            ? ['net', 'resourceGeneration', 'resourceInfrastructure', 'destroyed', 'investment']
            : ['net', 'destroyed', 'investment'];
          basisKeys.forEach(function (basisKey) {
            var categoryRow = point.allocationCategory &&
              point.allocationCategory[categoryKey] &&
              point.allocationCategory[categoryKey][basisKey]
              ? point.allocationCategory[categoryKey][basisKey]
              : { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 };
            setField('allocationCategory.' + categoryKey + '.' + basisKey + '.you', formatNumber(categoryRow.you));
            setField('allocationCategory.' + categoryKey + '.' + basisKey + '.opponent', formatNumber(categoryRow.opponent));
            setField('allocationCategory.' + categoryKey + '.' + basisKey + '.delta', formatSigned(categoryRow.delta));
          });
        });
        syncDestroyedRowVisibility(point);
        setTitle(
          '[data-total-pool-tooltip]',
          point.totalPoolTooltip || 'Economic net + Technology net + Military net + Other net = Total pool'
        );
${adjustedUpdate}
        setField('gather.you', formatNumber(point.gather.you));
        setField('gather.opponent', formatNumber(point.gather.opponent));
        setField('gather.delta', formatSigned(point.gather.delta));
        ['economy', 'military', 'technology'].forEach(function (key) {
          var strategyRow = point.strategy && point.strategy[key]
            ? point.strategy[key]
            : { you: 0, opponent: 0, delta: 0 };
          setField('strategy.' + key + '.you', formatStrategyShare(strategyRow.you));
          setField('strategy.' + key + '.opponent', formatStrategyShare(strategyRow.opponent));
          setField('strategy.' + key + '.delta', formatSignedPercentagePoints(strategyRow.delta));
        });
        Object.keys(allocationGraphDefs).forEach(function (key) {
          var def = allocationGraphDefs[key];
          var allocationRow = point.allocation && point.allocation[key]
            ? point.allocation[key]
            : { you: 0, opponent: 0, delta: 0, youShare: 0, opponentShare: 0, shareDelta: 0 };
          var labelText = def.mode === 'absolute'
            ? def.label + ' Δ ' + formatSigned(allocationRow.delta)
            : def.label + ' Δ ' + formatSignedPercentagePoints(allocationRow.shareDelta);
          setSvgLabel('[data-hover-label-strategy-' + key + ']', point.strategyX, labelText);
        });

        setVerticalLine('[data-hover-line-strategy]', point.strategyX);
        setSvgLabel('[data-hover-label-strategy-time]', point.strategyX, point.timeLabel);
        renderBandBreakdown(point);
        syncMobileTimeline(point);
      }

      function resetInspectorScrollToTop() {
        document.querySelectorAll('.hover-inspector').forEach(function (inspector) {
          // Reset internal scroll first so the inspector shows the eyebrow,
          // selected time, and event impact at the top regardless of where
          // the user had previously scrolled.
          if (typeof inspector.scrollTo === 'function') {
            inspector.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          }
          inspector.scrollTop = 0;

          // Determine the scrolling ancestor for this inspector. When the
          // inspector is sticky (desktop layout), its own .scrollTop was the
          // relevant container. When the inspector is static (responsive
          // layout), the scrollable container is normally the document, but
          // some embeds nest the report inside another scroll container.
          var style = window.getComputedStyle ? window.getComputedStyle(inspector) : null;
          var isSticky = !!style && style.position === 'sticky';
          if (isSticky) return;

          if (typeof inspector.scrollIntoView === 'function') {
            try {
              inspector.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
            } catch (_error) {
              inspector.scrollIntoView(true);
            }
          }
        });
      }

      function pointHasSignificantEvent(point) {
        return !!(point && point.significantEvent);
      }

      function snapshotHasSignificantEventAtTimestamp(timestamp) {
        if (timestamp === null || timestamp === undefined) return false;
        return pointHasSignificantEvent(byTimestamp.get(String(timestamp)));
      }

      function selectPointByIndex(index, shouldUpdateUrl, shouldResetInspectorScroll, analyticsSource) {
        if (hoverData.length === 0) return;
        var safeIndex = safePointIndex(index);
        var point = hoverData[safeIndex];
        if (!point) return;
        pinned = true;
        document.body.setAttribute('data-hover-pinned', 'true');
        updateInspector(point.timestamp);
        if (shouldResetInspectorScroll) resetInspectorScrollToTop();
        if (shouldUpdateUrl) replaceTimestampInUrl(point.timestamp);
        if (analyticsSource) {
          trackAnalyticsEvent('timestamp selected', analyticsPointProperties(point, analyticsSource));
        }
      }

      function selectTimestamp(timestamp, shouldUpdateUrl, shouldResetInspectorScroll, analyticsSource) {
        var nearest = nearestTimestamp(Number(timestamp));
        if (nearest === null) return;
        selectPointByIndex(pointIndexForTimestamp(nearest), shouldUpdateUrl, shouldResetInspectorScroll, analyticsSource);
      }

      function shouldResetInspectorScrollForChartClick(target, timestamp) {
        // Direct hit on the marker <g>.
        if (target && target.hasAttribute && target.hasAttribute('data-significant-event-marker')) {
          return true;
        }
        // Fallback: the click landed on a sibling hover target that shares
        // the same timestamp as a significant event (e.g. when a stem-area
        // click was intercepted by the transparent strategy-hover rect).
        var nearest = nearestTimestamp(Number(timestamp));
        return snapshotHasSignificantEventAtTimestamp(nearest);
      }

      function scheduleInspector(timestamp) {
        scheduledTimestamp = timestamp;
        if (framePending) return;
        framePending = true;
        var run = function () {
          framePending = false;
          if (!pinned && scheduledTimestamp !== null) updateInspector(scheduledTimestamp);
        };
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(run);
        } else {
          window.setTimeout(run, 16);
        }
      }

      document.querySelectorAll('.band-toggle[data-band-key]').forEach(function (button) {
        button.addEventListener('click', function () {
          var key = button.getAttribute('data-band-key');
          if (!key) return;
          closeDestroyedTooltips();
          selectedBand = key;
          selectedInvestmentCategory = button.getAttribute('data-allocation-investment-category') || '';
          selectedEconomicRoleFilter = key === 'economic'
            ? button.getAttribute('data-economic-role-filter') || ''
            : '';
          if (selectedInvestmentCategory) selectedEconomicRoleFilter = '';
          syncBandSelection();
          if (currentTimestamp !== null) {
            updateInspector(currentTimestamp);
          }
          trackAnalyticsEvent('band filter changed', {
            band_key: key,
            band_label: bandLabels[key] || key,
            investment_category: selectedInvestmentCategory || '',
            economic_role_filter: selectedEconomicRoleFilter || '',
            timestamp: currentTimestamp
          });
        });
      });

      document.querySelectorAll('[data-destroyed-help-button]').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          toggleDestroyedTooltip(button);
        });
      });

      document.querySelectorAll('[data-allocation-category-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
          closeDestroyedTooltips();
          var key = button.getAttribute('data-allocation-category-toggle');
          if (!key) return;
          var collapsed = button.getAttribute('aria-expanded') !== 'false';
          setCategoryCollapsed(key, collapsed);
          trackAnalyticsEvent('allocation category toggled', {
            category_key: key,
            expanded: !collapsed,
            timestamp: currentTimestamp
          });
        });
      });

      document.addEventListener('click', function (event) {
        var target = event.target;
        if (target && target.closest && target.closest('[data-destroyed-help-button]')) return;
        closeDestroyedTooltips();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeDestroyedTooltips();
      });

      document.querySelectorAll('.inspector-table-wrap').forEach(function (wrap) {
        wrap.addEventListener('keydown', function (event) {
          if (event.key === 'ArrowRight') {
            wrap.scrollLeft += 40;
            event.preventDefault();
            return;
          }
          if (event.key === 'ArrowLeft') {
            wrap.scrollLeft -= 40;
            event.preventDefault();
          }
        });
      });

      document.querySelectorAll('[data-mobile-timeline-slider]').forEach(function (slider) {
        slider.addEventListener('input', function () {
          var targetIndex = safePointIndex(Number(slider.value));
          selectPointByIndex(targetIndex, true, false, 'mobile-slider');
          trackMobileTimelineChanged(hoverData[targetIndex], 'mobile-slider', targetIndex);
        });
      });

      document.querySelectorAll('[data-mobile-timeline-step]').forEach(function (button) {
        button.addEventListener('click', function () {
          var step = Number(button.getAttribute('data-mobile-timeline-step') || 0);
          var targetIndex = safePointIndex(pointIndexForTimestamp(currentTimestamp) + step);
          selectPointByIndex(targetIndex, true, false, 'mobile-step');
          trackMobileTimelineChanged(hoverData[targetIndex], 'mobile-step', targetIndex, {
            step: step
          });
        });
      });

      document.querySelectorAll('[data-mobile-details] > summary').forEach(function (summary) {
        summary.addEventListener('click', function () {
          var details = summary.parentElement;
          if (details) details.setAttribute('data-mobile-user-toggled', 'true');
        });
      });

      document.querySelectorAll('[data-significant-event-underdog-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
          var point = currentTimestamp === null ? null : byTimestamp.get(String(currentTimestamp));
          document.querySelectorAll('[data-significant-event-underdog-details]').forEach(function (details) {
            if (details.hidden) return;
            details.open = true;
            if (details.scrollIntoView) details.scrollIntoView({ block: 'nearest' });
          });
          trackAnalyticsEvent('event explanation opened', analyticsPointProperties(point, 'event-explanation'));
        });
      });

      function syncMobileDetailsForViewport() {
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
        document.querySelectorAll('[data-mobile-details]').forEach(function (details) {
          if (isMobile) {
            if (!details.hasAttribute('data-mobile-user-toggled')) details.removeAttribute('open');
            return;
          }
          details.setAttribute('open', '');
        });
      }

      if (window.addEventListener) {
        window.addEventListener('resize', syncMobileDetailsForViewport);
      }

      document.querySelectorAll('.recap-link').forEach(function (link) {
        link.addEventListener('click', function () {
          var linkKind = link.classList && link.classList.contains('feedback-link')
            ? 'feedback'
            : 'aoe4world-summary';
          trackAnalyticsEvent('match outbound link clicked', outboundLinkProperties(link, linkKind));
        });
      });

      document.querySelectorAll('.hover-target[data-hover-timestamp]').forEach(function (target) {
        target.addEventListener('pointerenter', function () {
          if (!pinned) scheduleInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('pointermove', function () {
          if (!pinned) scheduleInspector(target.getAttribute('data-hover-timestamp'));
        });
        target.addEventListener('click', function () {
          var selectedTimestamp = Number(target.getAttribute('data-hover-timestamp'));
          var shouldResetInspectorScroll = shouldResetInspectorScrollForChartClick(target, selectedTimestamp);
          selectTimestamp(selectedTimestamp, true, shouldResetInspectorScroll, 'chart');
        });
        target.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          var selectedTimestamp = Number(target.getAttribute('data-hover-timestamp'));
          var shouldResetInspectorScroll = shouldResetInspectorScrollForChartClick(target, selectedTimestamp);
          selectTimestamp(selectedTimestamp, true, shouldResetInspectorScroll, 'keyboard');
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        pinned = false;
        document.body.removeAttribute('data-hover-pinned');
        replaceTimestampInUrl(null);
        if (hoverData[0]) updateInspector(hoverData[0].timestamp);
      });

      function initializeSelection() {
        syncBandSelection();
        var requestedTimestamp = requestedTimestampFromUrl();
        if (requestedTimestamp !== null) {
          var nearest = nearestTimestamp(requestedTimestamp);
          if (nearest !== null) {
            pinned = true;
            document.body.setAttribute('data-hover-pinned', 'true');
            replaceTimestampInUrl(nearest);
            updateInspector(nearest);
            syncMobileDetailsForViewport();
            return;
          }
        }
        if (hoverData[0]) updateInspector(hoverData[0].timestamp);
        syncMobileDetailsForViewport();
      }

      setHoverData(JSON.parse(payloadEl.textContent));
      initializeSelection();
    }());
  </script>`;
}
