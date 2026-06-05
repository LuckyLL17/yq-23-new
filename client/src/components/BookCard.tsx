import { Coins, User } from 'lucide-react';

interface BookCardProps {
  book: {
    id: number;
    title: string;
    author: string;
    cover?: string;
    condition: string;
    points_required: number;
    holder_name?: string;
    category?: string;
  };
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <div className="book-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg cursor-pointer">
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <span className="text-4xl">📖</span>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">{book.points_required}</span>
        </div>
        {book.category && (
          <div className="absolute top-3 left-3 bg-primary-500 text-white px-2 py-1 rounded-lg text-xs">
            {book.category}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-book-ink truncate text-lg">{book.title}</h3>
        <p className="text-gray-500 text-sm mt-1">{book.author}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{book.condition}</span>
          {book.holder_name && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>{book.holder_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;
