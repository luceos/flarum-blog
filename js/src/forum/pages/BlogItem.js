import Page from 'flarum/components/Page';
import avatar from 'flarum/helpers/avatar';
import Button from 'flarum/components/Button';
import ReplyComposer from 'flarum/components/ReplyComposer';
import PostStream from 'flarum/components/PostStream';
import BlogCategories from '../components/BlogCategories';
import BlogPostController from '../components/BlogPostController';

export default class BlogItem extends Page {
  init() {
    super.init();

    app.setTitle(app.translator.trans('v17development-flarum-blog.forum.blog'));

    // Send history push
    app.history.push('blogArticle');

    this.bodyClass = 'BlogItemPage';

    this.loading = true;
    this.found = false;
    this.article = null;
    // this.posts = [];

    this.loadBlogItem();
  }

  // Load blog overview
  loadBlogItem() {
    const preloadBlogOverview = app.preloadedApiDocument();

    if (preloadBlogOverview) {
      // We must wrap this in a setTimeout because if we are mounting this
      // component for the first time on page load, then any calls to m.redraw
      // will be ineffective and thus any configs (scroll code) will be run
      // before stuff is drawn to the page.
      setTimeout(this.show.bind(this, preloadBlogOverview), 0);
    } else {
      app.store.find('discussions', m.route.param('id').split('-')[0], {
        include: 'user,tags,firstPost,blogMeta,posts,posts.discussion,posts.user'
      })
        .then(this.show.bind(this))
        .catch(() => {
          m.redraw();
        });
    }

    m.lazyRedraw();
  }

  // Show blog post
  show(article) {
    // Set article data
    this.article = article;

    // Update title
    app.setTitle(`${article.title()} - ${app.translator.trans('v17development-flarum-blog.forum.blog')}`);

    this.loading = false;

    let includedPosts = [];
    if (article.payload && article.payload.included) {
      const articleId = article.id();

      includedPosts = article.payload.included
        .filter(
          (record) =>
            record.type === 'posts' &&
            record.relationships &&
            record.relationships.discussion &&
            record.relationships.discussion.data.id === articleId
        )
        .map((record) => app.store.getById('posts', record.id))
        .sort((a, b) => a.id() - b.id())
        .slice(0, 20);
    }

    this.stream = new PostStream({ discussion: article, includedPosts });
    this.stream.on('positionChanged', this.positionChanged.bind(this));

    m.lazyRedraw();
  }

  view() {
    const blogImage = this.article && this.article.blogMeta() && this.article.blogMeta().featuredImage() ? `url(${this.article.blogMeta().featuredImage()})` : null;
    let articlePost = null;

    if(!this.loading && this.article) {
      articlePost = this.article.firstPost() ? this.article.firstPost() : app.store.getById('posts', this.article.firstPostId());
    }

    return (
      <div className={"FlarumBlogItem"}>
        <div className={"container"}>
          <div className={"FlarumBlog-Article"}>
            <div className={"FlarumBlog-Article-Container"}>
              <div className={"FlarumBlog-Article-Content"}>
                <div 
                  className={`FlarumBlog-Article-Image FlarumBlog-default-image ${this.loading ? 'FlarumBlog-Article-GhostImage' : ''}`} 
                  style={{ 
                    backgroundImage: blogImage,
                    opacity: this.article && this.article.isHidden() ? 0.4 : null
                  }}
                  />

                {this.article && app.session.user && (app.session.user.canEdit() || this.article.canRename() || (this.article.posts() && this.article.posts()[0].canEdit())) && (
                  <BlogPostController article={this.article} />
                )}

                {/* Article Categories */}
                <div className={"FlarumBlog-Article-Categories"}>
                  {!this.loading && this.article && this.article.tags() && this.article.tags().map(tag => (
                    <a href={app.route("blogCategory", { slug: tag.slug() })} config={m.route}>{tag.name()}</a>
                  ))}

                  {this.loading && (
                    [0, 1].map(() => (<span className={"FlarumBlog-Article-GhostCategory"}>Category</span>))
                  )}
                </div>
                
                <div className={"FlarumBlog-Article-Post"}>
                  {/* Article name */}
                  <h3 className={this.loading ? 'FlarumBlog-Article-GhostTitle' : null}>
                    {this.article ? this.article.title() : 'Ghost title'} 
                    {this.article && this.article.isHidden() && `(${app.translator.trans('v17development-flarum-blog.forum.hidden')})`}
                  </h3>
                  
                  {this.loading && [0, 1, 2].map(() => (
                    <div>
                      <p className={"FlarumBlog-Article-GhostParagraph"}>&nbsp;</p>
                      <p className={"FlarumBlog-Article-GhostParagraph"}>&nbsp;</p>
                      <p className={"FlarumBlog-Article-GhostParagraph"}>&nbsp;</p>
                      <p>&nbsp;</p>
                    </div>
                  ))}

                  <div className={"Post-body"}>
                    {!this.loading && this.article.blogMeta() && this.article.blogMeta().isPendingReview() == true && (
                      <blockquote class="uncited" style={{ fontSize: '16px' }}><div><span className={"far fa-clock"} style={{ marginRight: '5px' }} /> {app.translator.trans('v17development-flarum-blog.forum.review_article.pending_review')}</div></blockquote>
                    )}

                    {!this.loading && articlePost && m.trust(articlePost.contentHtml())}

                  </div>
                </div>
              </div>

              <div className={"FlarumBlog-Article-Comments"}>
                <h4>{app.translator.trans('v17development-flarum-blog.forum.comment_section.comments')} ({this.article ? (this.article.commentCount() - 1) : 0})</h4>
                {/* Locked */}
                {!this.loading && this.article.isLocked && this.article.isLocked() && (
                  <div className={"Post-body"}>
                    <blockquote class="uncited"><div><span className={"far fa-lock"} style={{ marginRight: '5px' }} /> {app.translator.trans('v17development-flarum-blog.forum.comment_section.locked')}</div></blockquote>
                  </div>
                )}

                {!this.loading && this.stream && this.stream.render()}
              </div>
            </div>

            <div className={"FlarumBlog-Article-Author"}>
              <div className={"FlarumBlog-Article-Author-Info"}>
                <div className={`FlarumBlog-Article-Author-background ${this.loading ? 'FlarumBlog-Author-Ghost' : ''}`} style={{ backgroundColor: this.article && this.article.user() ? this.article && this.article.user().color() : null }} />

                <div className={"FlarumBlog-Article-Author-Avatar"}>{this.article && this.article.user() ? avatar(this.article.user()) : <span className={"Avatar FlarumBlog-Author-Ghost"} />}</div>

                {this.article && this.article.user() && (
                  <div style={{ padding: '0 20px 20px' }}>
                    <span className={"FlarumBlog-Article-Author-Name"}>{this.article.user().displayName()}</span>
                    <p className={"FlarumBlog-Article-Author-Bio"}>{this.article.user().bio()}</p>
                  </div>
                )}

                {this.loading && (
                  <div>
                    <span className={"FlarumBlog-Article-Author-Name FlarumBlog-Author-Ghost"}>&nbsp;</span>
                    <p className={"FlarumBlog-Article-Author-Bio FlarumBlog-Author-Ghost"}>&nbsp;</p>
                    <p className={"FlarumBlog-Article-Author-Bio FlarumBlog-Author-Ghost"}>&nbsp;</p>
                    <p className={"FlarumBlog-Article-Author-Bio FlarumBlog-Author-Ghost"}>&nbsp;</p>
                  </div>
                )}
              </div>

              <BlogCategories />
            </div>
          </div>
        </div>
      </div>
    )
  }

  positionChanged(startNumber, endNumber) {
    const article = this.article;

    if (app.session.user && endNumber > (article.lastReadPostNumber() || 0)) {
      article.save({ lastReadPostNumber: endNumber });
      m.redraw();
    }

  }
}