import { create } from 'zustand';
import type { Article } from '@/src/db/schema';
import { getAllArticles, getArticle, deleteArticle as dbDeleteArticle, deleteArticlesByStatus } from '@/src/db/queries';

interface ArticlesState {
  articles: Article[];
  loaded: boolean;
  loadArticles: () => void;
  getArticleById: (id: string) => Article | null;
  refreshArticle: (id: string) => Article | null;
  removeArticle: (id: string) => void;
  removeFailedArticles: () => void;
}

export const useArticlesStore = create<ArticlesState>((set, get) => ({
  articles: [],
  loaded: false,

  loadArticles: () => {
    const articles = getAllArticles();
    set({ articles, loaded: true });
  },

  getArticleById: (id: string) => {
    return getArticle(id);
  },

  refreshArticle: (id: string) => {
    const article = getArticle(id);
    if (article) {
      const articles = get().articles.map((a) => (a.id === id ? article : a));
      set({ articles });
    }
    return article;
  },

  removeArticle: (id: string) => {
    dbDeleteArticle(id);
    set({ articles: get().articles.filter((a) => a.id !== id) });
  },

  removeFailedArticles: () => {
    deleteArticlesByStatus('error');
    set({ articles: get().articles.filter((a) => a.status !== 'error') });
  },
}));
