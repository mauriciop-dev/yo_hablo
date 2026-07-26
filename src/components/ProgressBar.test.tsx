import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  const mockSkills = [
    { skill: 'Speaking', level: 50, color: 'bg-emerald-500', icon: <span>S</span> },
    { skill: 'Listening', level: 30, color: 'bg-blue-500', icon: <span>L</span> },
  ];

  it('renders overall progress', () => {
    render(<ProgressBar overall={42} skills={mockSkills} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Progreso General')).toBeInTheDocument();
  });

  it('renders all skill bars', () => {
    render(<ProgressBar overall={50} skills={mockSkills} />);
    expect(screen.getByText('Speaking')).toBeInTheDocument();
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getAllByText('50%')).toHaveLength(2);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders streak days when provided', () => {
    render(<ProgressBar overall={60} skills={mockSkills} streakDays={7} />);
    expect(screen.getByText(/7 días/)).toBeInTheDocument();
  });
});
