import React from 'react';
import MainScreen from '../lock/main_screen';
import MainScreenContainer from '../lock/main_screen_container';
import SignedInConfirmation from '../lock/signed_in_confirmation';
import SocialButtonsPane from '../panes/social_buttons_pane';
import { close } from './actions';
import * as l from '../lock/index';

export default class AskSocialNetwork extends MainScreenContainer {

  constructor(props) {
    super(props, "network", "cred");
  }

  handleClose() {
    close(l.id(this.props.lock));
  }

  render() {
    const { lock } = this.props;

    const auxiliaryPane = l.signedIn(lock) ?
      <SignedInConfirmation closeHandler={::this.handleClose} key="auxiliarypane" lock={lock} /> :
      null;

    return (
      <MainScreen
        auxiliaryPane={auxiliaryPane}
        footerText={this.t(["footerText"])}
        headerText={this.t(["headerText"])}
        lock={lock}
        ref="cred"
        showSubmitButton={false}
      >
        <SocialButtonsPane lock={lock} />
      </MainScreen>
    );
  }

}
