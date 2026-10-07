import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MVSidebarFiles from './MVSidebarFiles';

const mockFileint = {
    mode: 'tables',
    fileType: 'ms',
    spinsysTarget: 'simpson',
    spinsysScope: 'system',
    perSite: false,
    isZipExport: false,
    hasMSData: true,
    hasEFGData: true,
    hasQuadrupolarNuclei: true,
    hasISCData: true,
    hasCIFLabels: true,
    includeMS: true,
    includeEFG: true,
    includeD: false,
    includeJ: false,
    includeEuler: false,
    includeAngles: true,
    includeCrossTerms: true,
    msIsotropic: false,
    spinSysQuadrupoleOrder: 2,
    effectiveQuadrupoleOrder: 2,
    mergeByLabel: false,
    averageGroups: '',
    observedNucleus: '',
    dipolarCutoff: null,
    dipolarHomonuclear: false,
    fileFormat: 'csv',
    precision: 5,
    fileName: 'mvtable_model_ms.csv',
    mimeType: 'text/csv',
    dimension: 4,
    spinHalfEquivalent: 2.0,
    feasibility: 'silent',
    hasValidSelection: true,
    hasUsableSelection: true,
    selectionStatus: 'valid',
    selectedCount: 2,
    maxCoupledAtoms: 64,
    couplingsRequested: false,
    missingReferences: [],
    availableIsotopes: ['13C', '1H'],
    siteCount: 2,
    largestSiteDimension: 2,
    simplificationWarnings: [],
    fileValid: true,
    generateFile: vi.fn(() => 'mock file content'),
    generateSplitZip: vi.fn(() => new Uint8Array([1, 2, 3])),
    generatePreviewText: vi.fn(() => 'mock preview text'),
};

vi.mock('../store', () => ({
    useFilesInterface: () => mockFileint,
    useAppInterface: () => ({}),
}));

vi.mock('../../utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        saveContents: vi.fn(),
        copyContents: vi.fn(),
    };
});

describe('MVSidebarFiles', () => {
    it('renders sidebar with title Export and mode switch', () => {
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText('Export')).toBeInTheDocument();
        expect(screen.getByText('Report tables')).toBeInTheDocument();
        expect(screen.getByText('Spin system')).toBeInTheDocument();
        expect(screen.getByText('Save report table')).toBeInTheDocument();
    });

    it('uses switches rather than radio buttons for the two-way choices', () => {
        mockFileint.mode = 'spinsys';
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0);
        // Export type, simulation type, simulator, quadrupole order.
        expect(container.querySelectorAll('.mv-export-choice')).toHaveLength(4);
    });

    it('highlights the live side of a choice', () => {
        mockFileint.mode = 'spinsys';
        const { container } = render(<MVSidebarFiles show={true} />);

        const exportChoice = container.querySelector('.mv-export-choice');
        expect(exportChoice.querySelector('.mv-choice-active').textContent).toBe('Spin system');
    });

    it('reports file count per site rather than the whole-system product', () => {
        // Per site each file is one nucleus, so the product over every site is
        // not what anything will cost to simulate.
        mockFileint.mode = 'spinsys';
        mockFileint.perSite = true;
        mockFileint.spinsysScope = 'site';
        mockFileint.dimension = 6.05e7;
        mockFileint.siteCount = 243;
        mockFileint.largestSiteDimension = 6;
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).toMatch(/243 files/);
        expect(container.textContent).toMatch(/largest dimension 6/);
        expect(container.textContent).not.toMatch(/System dimension/);

        mockFileint.perSite = false;
        mockFileint.spinsysScope = 'system';
        mockFileint.dimension = 4;
    });

    it('displays spin system options when mode is spinsys', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.fileName = 'model.spinsys';
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText('Simulation type')).toBeInTheDocument();
        expect(screen.getByText('Full spin system')).toBeInTheDocument();
        expect(screen.getByText('One file per site')).toBeInTheDocument();
        expect(screen.getByText('Simulator')).toBeInTheDocument();
        expect(screen.getByText('SIMPSON')).toBeInTheDocument();
        expect(screen.getByText('mrsimulator')).toBeInTheDocument();
        expect(screen.getByText(/System dimension:/)).toBeInTheDocument();
        expect(screen.getByText(/Save spin system/)).toBeInTheDocument();
    });

    it('uses one heading scale for every section', () => {
        // The panel used to mix h3 defaults with bold radio-group labels, so
        // sibling sections looked like they sat at different levels.
        mockFileint.mode = 'spinsys';
        const { container } = render(<MVSidebarFiles show={true} />);

        const headings = [...container.querySelectorAll('.mv-export-heading')].map(h => h.textContent);
        expect(headings).toEqual(['Simulation type', 'Simulator', 'Interactions', 'Sites']);
        expect(container.querySelectorAll('h3:not(.mv-export-heading)')).toHaveLength(0);
    });

    it('offers no cross-terms switch, only a quadrupole order', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.includeEFG = true;
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).not.toMatch(/Second-order cross-terms/);
        expect(screen.getByText('First order')).toBeInTheDocument();
        expect(screen.getByText('Second order')).toBeInTheDocument();
        expect(screen.getByText(/Includes quadrupolar cross-terms/)).toBeInTheDocument();
    });

    it('hides the quadrupole order when EFG is unticked', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.includeEFG = false;
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).not.toMatch(/First order/);
        mockFileint.includeEFG = true;
    });

    it('hides couplings and offers orientations only in per-site mode', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.spinsysScope = 'site';
        mockFileint.perSite = true;
        mockFileint.isZipExport = true;
        mockFileint.fileName = 'model_spinsys.zip';
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).not.toMatch(/Dipolar couplings/);
        expect(container.textContent).not.toMatch(/J couplings/);
        expect(screen.getByText(/Save one file per site/)).toBeInTheDocument();

        mockFileint.spinsysScope = 'system';
        mockFileint.perSite = false;
        mockFileint.isZipExport = false;
        mockFileint.fileName = 'model.spinsys';
    });

    it('keeps tensor orientations out of reach for a coupled system', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.perSite = false;
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).not.toMatch(/Include tensor orientations/);
    });

    it('disables J couplings option when file has no ISC data', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.perSite = false;
        mockFileint.hasISCData = false;
        render(<MVSidebarFiles show={true} />);

        const jCbox = screen.getByText('J couplings').closest('span').querySelector('input');
        expect(jCbox).toBeDisabled();

        mockFileint.hasISCData = true;
    });

    it('disables include EFG option when no quadrupolar nuclei are in the selection', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.perSite = false;
        mockFileint.hasQuadrupolarNuclei = false;
        render(<MVSidebarFiles show={true} />);

        const efgCbox = screen.getByText('Quadrupolar (EFG)').closest('span').querySelector('input');
        expect(efgCbox).toBeDisabled();

        mockFileint.hasQuadrupolarNuclei = true;
    });

    it('renders simplification warnings and notices distinctly', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.simplificationWarnings = [
            { level: 'warning', text: 'Dipolar couplings omitted from a 4-site system.' },
            { level: 'notice', text: 'Shielding anisotropy discarded.' },
        ];
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).toMatch(/Dipolar couplings omitted from a 4-site system/);
        expect(container.querySelector('.mv-warning-item')).toBeTruthy();
        expect(container.querySelector('.mv-notice-item')).toBeTruthy();

        mockFileint.simplificationWarnings = [];
    });

    it('shows blocked message when shielding reference is missing', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = true;
        mockFileint.selectionStatus = 'valid';
        mockFileint.missingReferences = ['C'];
        mockFileint.fileValid = false;
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText(/Export blocked:/)).toBeInTheDocument();
        expect(screen.getByText(/Missing shielding reference for element\(s\):/)).toBeInTheDocument();
    });

    it('hides the dimension box and explains why when nothing is selected', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = false;
        mockFileint.hasUsableSelection = false;
        mockFileint.selectionStatus = 'none';
        mockFileint.fileValid = false;
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText(/No atoms selected/)).toBeInTheDocument();
        expect(screen.queryByText(/System dimension:/)).not.toBeInTheDocument();
    });

    it('shows notice when selection belongs to a different model', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = false;
        mockFileint.hasUsableSelection = false;
        mockFileint.selectionStatus = 'model_mismatch';
        mockFileint.fileValid = false;
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText(/Selection does not belong to the active model/)).toBeInTheDocument();
    });

    it('still reports the system when couplings were refused for size', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = false;
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'couplings_too_large';
        mockFileint.selectedCount = 243;
        mockFileint.maxCoupledAtoms = 64;
        mockFileint.fileValid = false;
        const { container } = render(<MVSidebarFiles show={true} />);

        const text = container.textContent;
        expect(text).toMatch(/System dimension:/);
        expect(text).toMatch(/243 atoms selected/);
        expect(text).toMatch(/64-atom limit/);
        expect(text).toMatch(/one file per site, which is unaffected/);
    });

    it('disables the save button when the coupled file is withheld', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.spinsysTarget = 'simpson';
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'couplings_too_large';
        mockFileint.fileValid = false;
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText(/Save spin system/).closest('button')).toBeDisabled();
    });

    it('renders large Hilbert space dimensions readably', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = true;
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'valid';
        mockFileint.missingReferences = [];
        mockFileint.dimension = 2 ** 40;
        mockFileint.spinHalfEquivalent = 40;
        mockFileint.feasibility = 'warning';
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).toMatch(/1\.10e\+12/);
        expect(container.textContent).not.toMatch(/1099511627776/);
    });

    it('does not print Infinity when the dimension overflows', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'valid';
        mockFileint.missingReferences = [];
        mockFileint.dimension = Infinity;
        mockFileint.spinHalfEquivalent = Infinity;
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).not.toMatch(/Infinity/);
        expect(container.textContent).toMatch(/\u221e/);
    });

    it('names the coupled group in the warning when targeting mrsimulator', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = true;
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'valid';
        mockFileint.missingReferences = [];
        mockFileint.dimension = 8192;
        mockFileint.spinHalfEquivalent = 13;
        mockFileint.feasibility = 'warning';
        mockFileint.spinsysTarget = 'mrsimulator';
        const { container } = render(<MVSidebarFiles show={true} />);

        expect(container.textContent).toMatch(/largest coupled group/);
    });

    it('quotes the measured cost growth in the feasibility notices', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasValidSelection = true;
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'valid';
        mockFileint.missingReferences = [];
        mockFileint.dimension = 512;
        mockFileint.spinHalfEquivalent = 9;

        for (const feasibility of ['slow', 'warning']) {
            mockFileint.feasibility = feasibility;
            const { container, unmount } = render(<MVSidebarFiles show={true} />);

            expect(container.textContent).toMatch(/multiplies the cost roughly ×6/);
            expect(container.textContent).toMatch(/128 s at 1024/);
            if (feasibility === 'warning') expect(container.textContent).toMatch(/exceeds dimension 1024/);
            unmount();
        }
    });

    it('opens and closes preview modal in spin system mode', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasUsableSelection = true;
        render(<MVSidebarFiles show={true} />);

        const previewBtn = screen.getByText('Preview spin system');
        expect(previewBtn).toBeEnabled();

        fireEvent.click(previewBtn);
        expect(screen.getByText('mock preview text')).toBeInTheDocument();
        expect(screen.getByText(/Spin system preview/)).toBeInTheDocument();

        const closeBtn = screen.getByText('Close');
        fireEvent.click(closeBtn);
        expect(screen.queryByText('mock preview text')).not.toBeInTheDocument();
    });

    it('disables preview button when there is no usable selection', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.hasUsableSelection = false;
        render(<MVSidebarFiles show={true} />);

        const previewBtn = screen.getByText('Preview spin system').closest('button');
        expect(previewBtn).toBeDisabled();

        mockFileint.hasUsableSelection = true;
    });
});
