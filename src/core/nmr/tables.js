import { tableRow } from '../../utils';
import { formatTableComments } from './metadata';

/**
 * Generate a tabulated report string (MS, EFG, Dipolar, J) from a SpinSystem model.
 *
 * @param  {SpinSystem} sys      The SpinSystem model
 * @param  {string}     type     Table type: 'ms' | 'efg' | 'dip' | 'isc'
 * @param  {object}     options  Formatting and column options
 * @return {string}              Compiled table string
 */
export function generateReportTable(sys, type, options = {}) {
    const {
        tabWidth = 20,
        precision = 5,
        format = 'csv',
        includeEuler = false,
        eulerConvention = 'zyz',
        mergeByLabel = false,
        multiplicity = {},
    } = options;

    // Report tables carry no couplings, so a group is one row; the multiplicity
    // column says how many atoms that row stands for.
    const showMultiplicity = mergeByLabel || sys.sites.some(site => site.isAverageGroup);
    const multiplicityOf = (site, label) => (
        site.isAverageGroup ? site.averageGroupSize : (multiplicity[label] ?? 1)
    );

    const rowOptions = { width: tabWidth, precision, format };

    switch (type) {
        case 'ms':
            return generateMSTable(sys, rowOptions, { includeEuler, eulerConvention, showMultiplicity, multiplicityOf });
        case 'efg':
            return generateEFGTable(sys, rowOptions, { includeEuler, eulerConvention, showMultiplicity, multiplicityOf });
        case 'dip':
            return generateDipolarTable(sys, rowOptions, { includeEuler, eulerConvention, showMultiplicity, multiplicityOf });
        case 'isc':
            return generateJTable(sys, rowOptions, { includeEuler, eulerConvention, showMultiplicity, multiplicityOf });
        default:
            throw new Error(`Unknown table type: ${type}`);
    }
}

function generateMSTable(sys, rowOptions, opts) {
    let table = formatTableComments(sys, 'MS Table', opts);

    const header = ['Label', 'Isotope', 'No. in label'];
    if (opts.showMultiplicity) {
        header.push('Multiplicity');
    }
    header.push('s_iso/ppm', 'd_iso/ppm', 'Anisotropy/ppm', 'Red. aniso/ppm', 'Asymmetry', 'Span/ppm', 'Skew');
    if (opts.includeEuler) {
        header.push('alpha/deg', 'beta/deg', 'gamma/deg');
    }

    table += tableRow(header, rowOptions);

    for (const site of sys.sites) {
        if (!site.ms) continue;

        const row = [
            site.label,
            site.isotope,
            site.index + 1,
        ];

        if (opts.showMultiplicity) {
            row.push(opts.multiplicityOf(site, site.label));
        }

        row.push(
            site.ms.isotropy,
            site.hasShift ? site.shift_iso : null,
            site.ms.anisotropy,
            site.ms.reduced_anisotropy,
            site.ms.asymmetry,
            site.ms.span,
            site.ms.skew
        );

        if (opts.includeEuler) {
            const [a, b, g] = site.msEuler({ passive: true, degrees: true });
            row.push(a, b, g);
        }

        table += tableRow(row, rowOptions);
    }

    return table;
}

function generateEFGTable(sys, rowOptions, opts) {
    let table = formatTableComments(sys, 'EFG Table', opts);

    const header = ['Label', 'Isotope', 'No. in label'];
    if (opts.showMultiplicity) {
        header.push('Multiplicity');
    }
    header.push('V_zz/au', 'Anisotropy/au', 'Asymmetry', 'C_q/MHz');
    if (opts.includeEuler) {
        header.push('alpha/deg', 'beta/deg', 'gamma/deg');
    }

    table += tableRow(header, rowOptions);

    for (const site of sys.sites) {
        if (!site.efg) continue;

        const row = [
            site.label,
            site.isotope,
            site.index + 1,
        ];

        if (opts.showMultiplicity) {
            row.push(opts.multiplicityOf(site, site.label));
        }

        const Vzz = site.efg.haeberlen_eigenvalues[2];
        const CqMHz = site.isQuadrupoleActive ? site.Cq / 1e6 : null;

        row.push(
            Vzz,
            site.efg.anisotropy,
            site.efg.asymmetry,
            CqMHz
        );

        if (opts.includeEuler) {
            const [a, b, g] = site.efgEuler({ passive: true, degrees: true });
            row.push(a, b, g);
        }

        table += tableRow(row, rowOptions);
    }

    return table;
}

function generateDipolarTable(sys, rowOptions, opts) {
    let table = formatTableComments(sys, 'Dipolar coupling table', opts);

    const header = [
        'Label 1', 'Isotope 1', 'Index 1',
        'Label 2', 'Isotope 2', 'Index 2',
    ];
    if (opts.showMultiplicity) {
        header.push('Multiplicity 1', 'Multiplicity 2');
    }
    header.push(
        'Distance/Ang',
        'r_x/Ang', 'r_y/Ang', 'r_z/Ang',
        'D/kHz', 'Anisotropy/kHz', 'Red. aniso/kHz', 'Asymmetry'
    );
    if (opts.includeEuler) {
        header.push('alpha/deg', 'beta/deg', 'gamma/deg');
    }

    table += tableRow(header, rowOptions);

    for (const c of sys.couplings) {
        if (c.type !== 'D') continue;

        const s1 = sys.sites[c.site_i];
        const s2 = sys.sites[c.site_j];

        const row = [
            c.site_i_label,
            s1.isotope,
            c.site_i + 1,
            c.site_j_label,
            s2.isotope,
            c.site_j + 1,
        ];

        if (opts.showMultiplicity) {
            row.push(opts.multiplicityOf(s1, c.site_i_label), opts.multiplicityOf(s2, c.site_j_label));
        }

        row.push(
            c.distance,
            c.displacement[0],
            c.displacement[1],
            c.displacement[2],
            c.coupling_constant / 1000.0,
            c.anisotropy / 1000.0,
            c.reduced_anisotropy / 1000.0,
            c.asymmetry
        );

        if (opts.includeEuler) {
            const [a, b, g] = c.euler({ passive: true, degrees: true });
            row.push(a, b, g);
        }

        table += tableRow(row, rowOptions);
    }

    return table;
}

function generateJTable(sys, rowOptions, opts) {
    let table = formatTableComments(sys, 'J coupling table', opts);

    const header = [
        'Label 1', 'Isotope 1', 'Index 1',
        'Label 2', 'Isotope 2', 'Index 2',
    ];
    if (opts.showMultiplicity) {
        header.push('Multiplicity 1', 'Multiplicity 2');
    }
    header.push('J_iso/Hz', 'Anisotropy/Hz', 'Red. aniso/Hz', 'Asymmetry');
    if (opts.includeEuler) {
        header.push('alpha/deg', 'beta/deg', 'gamma/deg');
    }

    table += tableRow(header, rowOptions);

    for (const c of sys.couplings) {
        if (c.type !== 'J') continue;

        const s1 = sys.sites[c.site_i];
        const s2 = sys.sites[c.site_j];

        const row = [
            c.site_i_label,
            s1.isotope,
            c.site_i + 1,
            c.site_j_label,
            s2.isotope,
            c.site_j + 1,
        ];

        if (opts.showMultiplicity) {
            row.push(opts.multiplicityOf(s1, c.site_i_label), opts.multiplicityOf(s2, c.site_j_label));
        }

        row.push(
            c.coupling_constant,
            c.anisotropy,
            c.reduced_anisotropy,
            c.asymmetry
        );

        if (opts.includeEuler) {
            const [a, b, g] = c.euler({ passive: true, degrees: true });
            row.push(a, b, g);
        }

        table += tableRow(row, rowOptions);
    }

    return table;
}
