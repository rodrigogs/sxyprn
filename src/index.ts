import base from './base.js';
import videos from './videos.js';

export type {
  BlogOptions,
  DetailsInput,
  Pagination,
  PostAuthor,
  RequestOptions,
  RequestResponse,
  RetryableError,
  SearchOptions,
  SharedRequestConfig,
  SxyprnConfig,
  TagOptions,
  TagSort,
  Transport,
  TransportOptions,
  TransportResponse,
  VideoDetails,
  VideoListOptions,
  VideoListResult,
  VideoSummary,
} from './types/index.js';

const api = {
  videos,
  configure: base.configureRequest,
};

export default api;
