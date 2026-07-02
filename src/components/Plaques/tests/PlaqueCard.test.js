import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlaqueCard from '../PlaqueCard';

const plaque = {
  id: 'IMG_1331.JPEG_24',
  text: 'In loving memory of a survivor who walked these gardens',
  photo: {
    plaque_url: 'https://example.com/plaque.jpg',
    url: 'https://example.com/photo.jpg'
  }
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <PlaqueCard plaque={plaque} {...props} />
    </MemoryRouter>
  );
}

test('renders the inscription excerpt, a crop thumbnail, and both actions', () => {
  renderCard();

  expect(
    screen.getByText(/In loving memory of a survivor/i)
  ).toBeInTheDocument();

  const img = screen.getByRole('img');
  expect(img).toHaveAttribute('src', 'https://example.com/plaque.jpg');
  expect(img).toHaveAttribute('loading', 'lazy');

  const read = screen.getByRole('link', { name: /read plaque/i });
  expect(read).toHaveAttribute('href', '/detail/IMG_1331.JPEG_24');

  // The "View on map" action builds the deep link the map parses.
  const map = screen.getByRole('link', { name: /view on map/i });
  expect(map).toHaveAttribute('href', '/?plaque=IMG_1331.JPEG_24');
});

test('shows a walking-distance label when one is supplied', () => {
  renderCard({ distanceLabel: '~40 m away' });
  expect(screen.getByText('~40 m away')).toBeInTheDocument();
});
