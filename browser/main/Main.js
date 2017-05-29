import React, { PropTypes } from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './Main.styl'
import { connect } from 'react-redux'
import SideNav from './SideNav'
import TopBar from './TopBar'
import NoteList from './NoteList'
import Detail from './Detail'
import dataApi from 'browser/main/lib/dataApi'
import _ from 'lodash'
import ConfigManager from 'browser/main/lib/ConfigManager'
import modal from 'browser/main/lib/modal'
import InitModal from 'browser/main/modals/InitModal'
import mixpanel from 'browser/main/lib/mixpanel'
import mobileAnalytics from 'browser/main/lib/awsMobileAnalyticsConfig'
import eventEmitter from 'browser/main/lib/eventEmitter'

function focused () {
  mixpanel.track('MAIN_FOCUSED')
}

class Main extends React.Component {
  constructor (props) {
    super(props)

    mobileAnalytics.initAwsMobileAnalytics()

    let { config } = props

    this.state = {
      isRightSliderFocused: false,
      listWidth: config.listWidth,
      navWidth: config.navWidth,
      isLeftSliderFocused: false,
      fullScreen: false,
      noteDetailWidth: 0,
      mainBodyWidth: 0
    }

    this.fullScreenEditorCode = () => this.handleFullScreenButton()
  }

  getChildContext () {
    let { status, config } = this.props

    return {
      status,
      config
    }
  }

  componentDidMount () {
    let { dispatch, config } = this.props

    if (config.ui.theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark')
    } else {
      document.body.setAttribute('data-theme', 'default')
    }

    // Reload all data
    dataApi.init()
      .then((data) => {
        dispatch({
          type: 'INIT_ALL',
          storages: data.storages,
          notes: data.notes
        })

        if (data.storages.length < 1) {
          modal.open(InitModal)
        }
      })

    eventEmitter.on('editor:fullscreen', this.fullScreenEditorCode)
    window.addEventListener('focus', focused)
  }

  componentWillUnmount () {
    window.removeEventListener('focus', focused)
    eventEmitter.off('editor:fullscreen', this.fullScreenEditorCode)
  }

  handleLeftSlideMouseDown (e) {
    e.preventDefault()
    this.setState({
      isLeftSliderFocused: true
    })
  }

  handleRightSlideMouseDown (e) {
    e.preventDefault()
    this.setState({
      isRightSliderFocused: true
    })
  }

  handleMouseUp (e) {
    // Change width of NoteList component.
    if (this.state.isRightSliderFocused) {
      this.setState({
        isRightSliderFocused: false
      }, () => {
        let { dispatch } = this.props
        let newListWidth = this.state.listWidth
        // TODO: ConfigManager should dispatch itself.
        ConfigManager.set({listWidth: newListWidth})
        dispatch({
          type: 'SET_LIST_WIDTH',
          listWidth: newListWidth
        })
      })
    }

    // Change width of SideNav component.
    if (this.state.isLeftSliderFocused) {
      this.setState({
        isLeftSliderFocused: false
      }, () => {
        let { dispatch } = this.props
        let navWidth = this.state.navWidth
        // TODO: ConfigManager should dispatch itself.
        ConfigManager.set({ navWidth })
        dispatch({
          type: 'SET_NAV_WIDTH',
          navWidth
        })
      })
    }
  }

  handleMouseMove (e) {
    if (this.state.isRightSliderFocused) {
      let offset = this.refs.body.getBoundingClientRect().left
      let newListWidth = e.pageX - offset
      if (newListWidth < 10) {
        newListWidth = 10
      } else if (newListWidth > 600) {
        newListWidth = 600
      }
      this.setState({
        listWidth: newListWidth
      })
    }
    if (this.state.isLeftSliderFocused) {
      let navWidth = e.pageX
      if (navWidth < 80) {
        navWidth = 80
      } else if (navWidth > 600) {
        navWidth = 600
      }
      this.setState({
        navWidth: navWidth
      })
    }
  }

  handleFullScreenButton (e) {
    this.setState({ fullScreen: !this.state.fullScreen }, () => {
      const noteDetail = document.querySelector('.NoteDetail')
      const mainBody = document.querySelector('#main-body')
      const sliderRight = document.querySelector('#slider-right')
      const sliderLeft = document.querySelector('#slider-left')
      if (this.state.fullScreen) {
        this.state.noteDetailWidth = noteDetail.style.left
        this.state.mainBodyWidth = mainBody.style.left
        noteDetail.style.left = '0px'
        mainBody.style.left = '0px'
        sliderRight.style.display = 'none'
        sliderLeft.style.display = 'none'
      } else {
        noteDetail.style.left = this.state.noteDetailWidth
        mainBody.style.left = this.state.mainBodyWidth
        sliderRight.style.display = 'block'
        sliderLeft.style.display = 'block'
      }
    })
  }

  render () {
    let { config } = this.props

    return (
      <div
        className='Main'
        styleName='root'
        onMouseMove={(e) => this.handleMouseMove(e)}
        onMouseUp={(e) => this.handleMouseUp(e)}
      >
        <SideNav
          {..._.pick(this.props, [
            'dispatch',
            'data',
            'config',
            'location'
          ])}
          width={this.state.navWidth}
        />
        {!config.isSideNavFolded &&
          <div styleName={this.state.isLeftSliderFocused ? 'slider--active' : 'slider'}
            id='slider-left'
            style={{left: this.state.navWidth}}
            onMouseDown={(e) => this.handleLeftSlideMouseDown(e)}
            draggable='false'
          >
            <div styleName='slider-hitbox' />
          </div>
        }
        <div styleName={config.isSideNavFolded ? 'body--expanded' : 'body'}
          id='main-body'
          ref='body'
          style={{left: config.isSideNavFolded ? 44 : this.state.navWidth}}
        >
          <TopBar style={{width: this.state.listWidth}}
            {..._.pick(this.props, [
              'dispatch',
              'config',
              'data',
              'params',
              'location'
            ])}
          />
          <NoteList style={{width: this.state.listWidth}}
            {..._.pick(this.props, [
              'dispatch',
              'data',
              'config',
              'params',
              'location'
            ])}
          />
          <div styleName={this.state.isRightSliderFocused ? 'slider-right--active' : 'slider-right'}
            id='slider-right'
            style={{left: this.state.listWidth - 1}}
            onMouseDown={(e) => this.handleRightSlideMouseDown(e)}
            draggable='false'
          >
            <div styleName='slider-hitbox' />
          </div>
          <Detail
            style={{left: this.state.listWidth}}
            {..._.pick(this.props, [
              'dispatch',
              'data',
              'config',
              'params',
              'location'
            ])}
            ignorePreviewPointerEvents={this.state.isRightSliderFocused}
          />
        </div>
      </div>
    )
  }
}

Main.childContextTypes = {
  status: PropTypes.shape({
    updateReady: PropTypes.bool.isRequired
  }).isRequired,
  config: PropTypes.shape({}).isRequired
}

Main.propTypes = {
  dispatch: PropTypes.func,
  data: PropTypes.shape({}).isRequired
}

export default connect((x) => x)(CSSModules(Main, styles))
