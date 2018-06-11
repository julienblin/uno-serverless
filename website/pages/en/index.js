/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');
const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const siteConfig = require(process.cwd() + '/siteConfig.js');

function imgUrl(img) {
  return siteConfig.baseUrl + 'img/' + img;
}

function docUrl(doc, language) {
  return siteConfig.baseUrl + 'docs/' + (language ? language + '/' : '') + doc;
}

function pageUrl(page, language) {
  return siteConfig.baseUrl + (language ? language + '/' : '') + page;
}

const pre = "```";

class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    );
  }
}

Button.defaultProps = {
  target: '_self',
};

const SplashContainer = props => (
  <div className="homeContainer">
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
);

const Logo = props => (
  <div className="projectLogo">
    <img src={props.img_src} />
  </div>
);

const ProjectTitle = props => (
  <h2 className="projectTitle">
    {siteConfig.title}
    <small>{siteConfig.tagline}</small>
  </h2>
);

const PromoSection = props => (
  <div className="section promoSection">
    <div className="promoRow">
      <div className="pluginRowBlock">{props.children}</div>
    </div>
  </div>
);

class HomeSplash extends React.Component {
  render() {
    let language = this.props.language || '';
    return (
      <SplashContainer>
        {/* <Logo img_src={imgUrl('docusaurus.svg')} /> */}
        <div className="inner">
          <ProjectTitle />
          <PromoSection>
            <Button href="#get-started">Get started</Button>
            <Button href="#more-info">More info</Button>
            <Button href={docUrl('documentation.html', language)}>Documentation</Button>
          </PromoSection>
        </div>
      </SplashContainer>
    );
  }
}

const Block = props => (
  <Container
    padding={['bottom', 'top']}
    id={props.id}
    background={props.background}>
    <GridBlock align="center" contents={props.children} layout={props.layout} />
  </Container>
);

const Features = props => (
  <Block layout="fourColumn">
    {[
      {
        content: 'Get started quickly',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'top',
        title: 'Project generator',
      },
      {
        content: 'Combine the features you need',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'top',
        title: 'Middlewares & builders',
      },
      {
        content: 'Manage lifetime & instantiations',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'top',
        title: 'Dependency injection',
      },
      {
        content: 'Common services',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'top',
        title: 'Services',
      },
      {
        content: 'Push your API to production in 15 min.',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'top',
        title: 'Deployment ready',
      },
    ]}
  </Block>
);

const getStartedContent = `${pre}bash
npm install -g yo generator-opiniated-lambda
yo opiniated-lambda
${pre}

Then cd into the created project and:
${pre}bash
npm start -- local
${pre}
`;

const GetStarted = props => (
  <Block id="get-started">
    {[
      {
        content: getStartedContent,
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'left',
        title: 'Get started',
      },
    ]}
  </Block>
);

const MoreInfo = props => (
  <Block id="more-info" background="dark">
    {[
      {
        content: 'Opiniated lambda starts where AWS Lambda leaves you.',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'right',
        title: 'More info',
      },
    ]}
  </Block>
);

const Showcase = props => {
  if ((siteConfig.users || []).length === 0) {
    return null;
  }
  const showcase = siteConfig.users
    .filter(user => {
      return user.pinned;
    })
    .map((user, i) => {
      return (
        <a href={user.infoLink} key={i}>
          <img src={user.image} alt={user.caption} title={user.caption} />
        </a>
      );
    });

  return (
    <div className="productShowcaseSection paddingBottom">
      <h2>{"Who's Using This?"}</h2>
      <p>This project is used by all these people</p>
      <div className="logos">{showcase}</div>
      <div className="more-users">
        <a className="button" href={pageUrl('users.html', props.language)}>
          More {siteConfig.title} Users
        </a>
      </div>
    </div>
  );
};

class Index extends React.Component {
  render() {
    let language = this.props.language || '';

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          <Features />
          <GetStarted />
          <MoreInfo />
          <Showcase language={language} />
        </div>
      </div>
    );
  }
}

module.exports = Index;
