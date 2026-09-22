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
        mockFileint.missingReferences = ['C'];
        mockFileint.fileValid = false;
        render(<MVSidebarFiles show={true} />);

        expect(screen.getByText(/Export blocked:/)).toBeInTheDocument();
        expect(screen.getByText(/Missing shielding reference for element\(s\):/)).toBeInTheDocument();
    });
});
