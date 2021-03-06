import Page from 'flarum/components/Page';
import Button from 'flarum/components/Button';
import humanTime from 'flarum/helpers/humanTime';
import BlogCategories from '../components/BlogCategories';
import BlogComposer from '../utils/BlogComposer';
import tooltip from '../utils/tooltip';

export default class BlogOverview extends Page {
  init() {
    super.init();

    app.setTitle(app.translator.trans('v17development-flarum-blog.forum.blog'));

    this.bodyClass = 'BlogOverviewPage';

    this.isLoading = true;
    this.featuredPosts = [];
    this.posts = [];
    this.hasMore = null;

    // Send history push
    app.history.push('blog');

    this.loadBlogOverview();
  }

  // Load blog overview
  loadBlogOverview() {
    const preloadBlogOverview = app.preloadedApiDocument();

    if (preloadBlogOverview) {
      // We must wrap this in a setTimeout because if we are mounting this
      // component for the first time on page load, then any calls to m.redraw
      // will be ineffective and thus any configs (scroll code) will be run
      // before stuff is drawn to the page.
      setTimeout(this.show.bind(this, preloadBlogOverview), 0);
    } else {
      app.store.find('discussions', {
        filter: {
          q: `is:blog${m.route.param('slug') ? ` tag:${m.route.param('slug')}` : ''}`
        },
        include: 'user,tags,firstPost,blogMeta'
      })
        .then(this.show.bind(this))
        .catch(() => {
          m.redraw();
        });
    }

    m.lazyRedraw();
  }

  // Show blog posts
  show(articles) {
    if(articles.length === 0) return;

    this.featuredPosts = articles.slice(0, 3);
    this.posts = articles.length >= 4 ? articles.slice(3, articles.length) : [];

    this.isLoading = false;

    m.lazyRedraw();
  }

  title() {
    if(!m.route.param('slug')) {
      return <h2>{app.translator.trans('v17development-flarum-blog.forum.recent_posts')}</h2>;
    }

    const tag = app.store.all('tags').filter(tag => tag.slug() === m.route.param('slug'));

    return (
      <h2>
        {tag && tag[0] && tag[0].name()}
        <small> - <a href={app.route("blog")} config={m.route}>{app.translator.trans('v17development-flarum-blog.forum.return_to_overview')}</a></small>
      </h2>
    );
  }

  view() {
    return (
      <div className={"FlarumBlogOverview"}>
        <div className={"container"}>
          <div className={"BlogFeatured"}>
            {app.forum.attribute('canWriteBlogPosts') && (
              <Button 
                className={"Button FlarumBlogWrite"}
                onclick={() => this.newArticle()}
                icon={"fas fa-pencil"}
                >
                {app.translator.trans('v17development-flarum-blog.forum.compose.write_article')}
              </Button>
            )}

            {this.title()}

            <div style={{ clear: 'both' }} />

            <div className={"BlogFeatured-list"}>
              {/* Ghost data */}
              {this.isLoading && [0, 1, 2].map(() => (
                <div className={"BlogFeatured-list-item BlogFeatured-list-item-ghost"}>
                  <div className={"BlogFeatured-list-item-details"}>
                    <h4>&nbsp;</h4>

                    <div className={"data"}>
                      <span><i className={"far fa-wave"} /></span>
                    </div>
                  </div>
                </div>
              ))}
              
              {!this.isLoading && this.featuredPosts.length >= 0 && this.featuredPosts.map((article) => {
                const blogImage = article.blogMeta() && article.blogMeta().featuredImage() ? `url(${article.blogMeta().featuredImage()})` : null;
                const blogTag = article.tags() ? article.tags().filter(tag => tag.isChild()) : [];

                return (
                  <a 
                    href={app.route("blogArticle", { id: `${article.id()}-${article.slug()}` })} 
                    className={"BlogFeatured-list-item FlarumBlog-default-image"} 
                    style={{ backgroundImage: blogImage }}
                    config={m.route}
                    >
                    <div className={"BlogFeatured-list-item-top"}>
                      {blogTag[0] && (
                        <span>{blogTag[0].name()}</span>
                      )}
                      {article.isSticky() && (
                        <span><i className={"fas fa-thumbtack"} /></span>
                      )}
                      {((article.blogMeta() && article.blogMeta().isPendingReview() == true) || article.isHidden()) && (
                        <span><i className={"fas fa-eye-slash"} /></span>
                      )}
                      {article.blogMeta() && article.blogMeta().isPendingReview() == true && (
                        <span title={app.translator.trans('v17development-flarum-blog.forum.review_article.pending_review')} config={tooltip.bind(this)} data-placement={"bottom"}><i className={"far fa-clock"} /> {app.translator.trans('v17development-flarum-blog.forum.review_article.pending_review_title')}</span>
                      )}
                    </div>

                    <div className={"BlogFeatured-list-item-details"}>
                      <h4>{article.title()}</h4>

                      <div className={"data"}>
                        <span><i className={"far fa-clock"} /> {humanTime(article.createdAt())}</span>  
                        <span><i className={"far fa-user"} /> {article.user() ? article.user().displayName() : '[Deleted]'}</span>
                        <span><i className={"far fa-comment"} /> {article.commentCount()}</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <div className={"BlogScrubber"}>
            <div className={"BlogList"}>
              {this.isLoading && [false, false, true, false].map((state) => {
                return (
                  <div className={`BlogList-item BlogList-item-${state === true ? 'sized' : 'default'} BlogList-item-ghost`}>
                    <div className={"BlogList-item-photo FlarumBlog-default-image"}></div>
                    <div className={"BlogList-item-content"}>
                      <h4>&nbsp;</h4>
                      <p>&nbsp;</p>

                      <div className={"data"}>
                        <span><i className={"far fa-wave"} /></span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!this.isLoading && this.posts.length >= 1 && this.posts.map(article => {
                const blogImage = article.blogMeta() && article.blogMeta().featuredImage() ? `url(${article.blogMeta().featuredImage()})` : null;
                const isSized = article.blogMeta() && article.blogMeta().isSized();
                const summary = article.blogMeta() && article.blogMeta().summary() ? article.blogMeta().summary() : "";
                
                return (
                  <a
                    href={app.route("blogArticle", { id: `${article.id()}-${article.slug()}` })} 
                    className={`BlogList-item BlogList-item-${isSized ? 'sized' : 'default'}`}
                    config={m.route}>
                    <div className={"BlogList-item-photo FlarumBlog-default-image"} style={{ backgroundImage: blogImage }}></div>
                    <div className={"BlogList-item-content"}>
                      <h4>
                        {article.title()}
                        {((article.blogMeta() && article.blogMeta().isPendingReview() == true) || article.isHidden()) && (
                          <i className={"fas fa-eye-slash"} />
                        )}
                        {article.blogMeta() && article.blogMeta().isPendingReview() == true && (
                          <i className={"far fa-clock"} title={app.translator.trans('v17development-flarum-blog.forum.review_article.pending_review')} config={tooltip.bind(this)} />
                        )}
                      </h4>
                      <p>{summary}</p>

                      <div className={"data"}>
                        <span><i className={"far fa-clock"} /> {humanTime(article.createdAt())}</span>  
                        <span><i className={"far fa-user"} /> {article.user() ? article.user().displayName() : '[Deleted]'}</span>
                        <span><i className={"far fa-comment"} /> {article.commentCount()}</span>
                      </div>
                    </div>
                  </a>
                )
              })}

              {!this.isLoading && this.posts.length === 0 && (
                <p className={"FlarumBlog-reached-end"}>{app.translator.trans('v17development-flarum-blog.forum.no_more_posts')}</p>
              )}
            </div>

            <div className={"Sidebar"}>
              <BlogCategories />
            </div>
          </div>
        </div>
      </div>
    )
  }

  newArticle() {
    const component = new BlogComposer({
        user: app.session.user
    });

    let tags = [];

    app.forum.attribute('blogTags').forEach(tagId => {
      const tag = app.store.getById('tags', tagId);
      
      if(tags.length === 0 && !tag.isChild()) {
        tags.push(tag);
      }
    });

    // Update tags
    component.tags = tags;

    app.composer.load(component);
    app.composer.show();
  }
}