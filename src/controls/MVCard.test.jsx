import { render, screen } from '@testing-library/react';
import MVCard from './MVCard';

test('renders title, badge, and children', () => {
    render(
        <MVCard title="Atom A" badge="Al_1">
            <div>Card Content</div>
        </MVCard>
    );

    expect(screen.getByText('Atom A')).toBeTruthy();
    expect(screen.getByText('Al_1')).toBeTruthy();
    expect(screen.getByText('Card Content')).toBeTruthy();
});
