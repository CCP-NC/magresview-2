import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MVSidebarFiles from './MVSidebarFiles';

const mockFileint = {
    mode: 'tables',
    fileType: 'ms',
    spinsysTarget: 'simpson',
    hasMSData: true,
    hasEFGData: true,
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
    mergeByLabel: false,
    averageGroups: '',
    observedNucleus: '',
    dipolarCutoff: null,
    dipolarHomonuclear: false,
    fileFormat: 'csv',
    precision: 5,
    fileName: 'mvtable_model_ms.csv',
    splitFileName: 'model_spinsys.zip',
    dimension: 4,
    spinHalfEquivalent: 2.0,
    feasibility: 'silent',
    hasValidSelection: true,
    hasUsableSelection: true,
    selectionStatus: 'valid',
    selectedCount: 2,
    maxCoupledAtoms: 64,
    couplingsRequested: false,
    splitZipValid: true,
    missingReferences: [],
    availableIsotopes: ['13C', '1H'],
    fileValid: true,
    generateFile: vi.fn(() => 'mock file content'),
    generateSplitZip: vi.fn(() => new Uint8Array([1, 2, 3])),
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

    it('displays spin system options when mode is spinsys', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.fileName = 'model.spinsys';
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText('Simulator target:')).toBeInTheDocument();
        expect(screen.getByText('SIMPSON (.spinsys)')).toBeInTheDocument();
        expect(screen.getByText('mrsimulator (JSON)')).toBeInTheDocument();
        expect(screen.getByText(/System dimension:/)).toBeInTheDocument();
        expect(screen.getByText(/Save spin system/)).toBeInTheDocument();
        expect(screen.getByText('Save split archive (.zip)')).toBeInTheDocument();
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
        mockFileint.splitZipValid = true;
        const { container } = render(<MVSidebarFiles show={true} />);

        const text = container.textContent;
        expect(text).toMatch(/System dimension:/);
        expect(text).toMatch(/243 atoms selected/);
        expect(text).toMatch(/64-atom limit/);
        expect(text).toMatch(/split archive is unaffected/);
    });

    it('keeps the split archive enabled when the single file is blocked', () => {
        mockFileint.mode = 'spinsys';
        mockFileint.spinsysTarget = 'simpson';
        mockFileint.hasUsableSelection = true;
        mockFileint.selectionStatus = 'couplings_too_large';
        mockFileint.fileValid = false;
        mockFileint.splitZipValid = true;
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText(/Save spin system/).closest('button')).toBeDisabled();
        expect(screen.getByText('Save split archive (.zip)').closest('button')).toBeEnabled();
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
});
