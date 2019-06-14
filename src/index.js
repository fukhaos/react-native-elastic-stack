/* eslint-disable import/no-extraneous-dependencies */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Easing, PanResponder, View, Dimensions, Animated,
} from 'react-native';

/* eslint-enable import/no-extraneous-dependencies */

const window = Dimensions.get('window');
const emptyFunc = () => {};
const TRANSFORM_RANGE = 100;

export default class ElasticStack extends Component {
  static propTypes = {
    style: PropTypes.oneOfType(PropTypes.object),
    items: PropTypes.arrayOf(PropTypes.any).isRequired,
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
    onSwiped: PropTypes.func,
    infinite: PropTypes.bool,
    distDrag: PropTypes.number,
    onXChange: PropTypes.func,
    onYChange: PropTypes.func,
    itemWidth: PropTypes.number,
    itemHeight: PropTypes.number,
    directions: PropTypes.arrayOf(PropTypes.bool),
    renderItem: PropTypes.func.isRequired,
    onSwipedTop: PropTypes.func,
    rotateDegree: PropTypes.number,
    onSwipedLeft: PropTypes.func,
    onStackEnded: PropTypes.func,
    reduceScaleBy: PropTypes.number,
    onSwipedRight: PropTypes.func,
    onSwipedBottom: PropTypes.func,
    reduceDegreeBy: PropTypes.number,
    stackEffectHeight: PropTypes.number,
    reduceOpacityBy: PropTypes.number,
    activeItemIndex: PropTypes.number,
    reduceTransformBy: PropTypes.number,
    elastickItemsCount: PropTypes.number,
    itemBackgroundColor: PropTypes.string,
    onPanResponderGrant: PropTypes.func,
    onPanResponderRelease: PropTypes.func,
  };

  static defaultProps = {
    style: {},
    children: null,
    infinite: false,
    onSwiped: emptyFunc,
    distDrag: 70,
    onXChange: emptyFunc,
    onYChange: emptyFunc,
    itemWidth: window.width * 0.8,
    itemHeight: window.height * 0.8,
    directions: [true, true, true, true],
    onSwipedTop: emptyFunc,
    rotateDegree: 10,
    onSwipedLeft: emptyFunc,
    onStackEnded: emptyFunc,
    reduceScaleBy: 0.05,
    onSwipedRight: emptyFunc,
    onSwipedBottom: emptyFunc,
    reduceDegreeBy: 0.65,
    reduceOpacityBy: 0.2,
    activeItemIndex: 0,
    reduceTransformBy: 0.7,
    stackEffectHeight: 5,
    elastickItemsCount: 3,
    onPanResponderGrant: emptyFunc,
    itemBackgroundColor: 'rgba(0,0,0,0)',
    onPanResponderRelease: emptyFunc,
  };

  pan = new Animated.ValueXY();

  scale = new Animated.Value(0);

  opacity = new Animated.Value(0);

  panSwiping = new Animated.ValueXY();

  isStackEnded = false;

  constructor(props) {
    super(props);

    this.state = {
      canChange: true,
      directions: {
        top: props.directions[0],
        left: props.directions[1],
        bottom: props.directions[2],
        right: props.directions[3],
      },
    };

    this.animatedValueX = 0;
    this.animatedValueY = 0;

    this.activeItemIndex = props.activeItemIndex;

    this.pan.x.addListener(this.onXChange);
    this.pan.y.addListener(this.onYChange);

    this.initPanResponder();
  }

  render() {
    return (
      <View
        style={[
          this.props.style,
          {
            position: 'relative',
            width: this.props.itemWidth,
            height: this.props.itemHeight,
          },
        ]}
      >
        {this.renderElastickItems()}

        {this.props.children}
      </View>
    );
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      directions: {
        top: nextProps.directions[0],
        left: nextProps.directions[1],
        bottom: nextProps.directions[2],
        right: nextProps.directions[3],
      },
    });
  }

  goBack = () => {
    this.resetPanAndScale();
    this.setItemIndex(this.activeItemIndex - 1, () => {}, false);

    this.pan.setValue({ x: 0, y: -100 });
    this.panSwiping.setValue({ x: 0, y: -100 });
    this.onPanResponderRelease();
  };

  moveNext = (liked) => {
    if (this.state.canChange == false) return;
    this.setState({ canChange: false });
    const anime = {
      duration: 400,
      easing: Easing.exp,
      toValue: {
        x: liked ? 100 : -100,
        y: 0,
      },
    };

    Animated.parallel([
      Animated.timing(this.pan, anime),
      Animated.timing(this.panSwiping, anime),
    ]).start(() => {
      this.onPanResponderRelease();
      this.setState({ canChange: true });
    });
  };

  componentWillUnmount() {
    this.pan.x.removeAllListeners();
    this.pan.y.removeAllListeners();
  }

  renderElastickItems() {
    const {
      items, itemWidth, itemHeight, infinite, renderItem, elastickItemsCount,
    } = this.props;
    const itemsLength = items.length;

    if (!infinite && this.isStackEnded) {
      return null;
    }

    return Array.from({ length: elastickItemsCount }).map((_, i) => {
      const itemIndex = ElasticStack.calculateNextItemIndex(
        itemsLength,
        this.activeItemIndex + (i - 1),
      );
      const itemContent = items[itemIndex];

      if (!itemContent || (!infinite && itemIndex < this.activeItemIndex)) {
        return null;
      }

      const swipableItemStyle = this.calculateSwipableItemStyle(i);
      const handlers = this.panResponder.panHandlers;

      return (
        <Animated.View style={swipableItemStyle} {...handlers} key={`${itemIndex}`}>
          {renderItem(itemContent, itemWidth, itemHeight)}
        </Animated.View>
      );
    });
  }

  calculateSwipableItemStyle = (itemIndex) => {
    const {
      itemWidth,
      itemHeight,
      rotateDegree,
      reduceScaleBy,
      reduceDegreeBy,
      reduceOpacityBy,
      stackEffectHeight,
      reduceTransformBy,
      elastickItemsCount,
    } = this.props;

    const isFirst = itemIndex === 0;
    const currentPan = isFirst ? this.panSwiping : this.pan;

    // eslint-disable-next-line no-restricted-properties
    const rotateRange = rotateDegree * Math.pow(reduceDegreeBy, itemIndex);
    const rotate = currentPan.x.interpolate({
      inputRange: [-TRANSFORM_RANGE, 0, TRANSFORM_RANGE],
      outputRange: [`${-rotateRange}deg`, '0deg', `${rotateRange}deg`],
    });

    const opacityRange = 1 - reduceOpacityBy * itemIndex;
    const opacity = this.opacity.interpolate({
      inputRange: [0, 1],
      outputRange: [isFirst ? 1 : opacityRange, isFirst ? 0 : opacityRange + reduceOpacityBy],
    });

    const scaleRange = 1 - reduceScaleBy * itemIndex;
    const scale = this.scale.interpolate({
      inputRange: [0, 1],
      outputRange: [scaleRange, scaleRange + reduceScaleBy],
    });

    // eslint-disable-next-line no-restricted-properties
    const translateRange = (TRANSFORM_RANGE / 2) * Math.pow(reduceTransformBy, itemIndex);
    const translateX = currentPan.x.interpolate({
      inputRange: [-TRANSFORM_RANGE, 0, TRANSFORM_RANGE],
      outputRange: [-translateRange, 0, translateRange],
    });

    const scaledHeightDiff = (itemHeight - itemHeight * scaleRange) / 2;
    const zeroRange = scaledHeightDiff + itemIndex * stackEffectHeight;
    const translateY = currentPan.y.interpolate({
      inputRange: [-TRANSFORM_RANGE, 0, TRANSFORM_RANGE],
      outputRange: [-translateRange + zeroRange, zeroRange, translateRange + zeroRange],
    });

    return {
      width: itemWidth,
      height: itemHeight,
      zIndex: elastickItemsCount - itemIndex + 1,
      position: 'absolute',
      backgroundColor: this.props.itemBackgroundColor,
      opacity,
      transform: [{ rotate }, { translateX }, { translateY }, { scale }],
    };
  };

  initPanResponder = () => {
    this.panResponder = PanResponder.create({
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderGrant: this.onPanResponderGrant,
      onPanResponderRelease: this.onPanResponderRelease,
      onPanResponderTerminate: this.onPanResponderRelease,
      onMoveShouldSetPanResponder: this.onMoveShouldSetPanResponder,
      onStartShouldSetPanResponder: this.onStartShouldSetPanResponder,
      onPanResponderTerminationRequest: this.onPanResponderTerminationRequest,
      onMoveShouldSetPanResponderCapture: this.onMoveShouldSetPanResponderCapture,
      onStartShouldSetPanResponderCapture: this.onStartShouldSetPanResponderCapture,
    });
  };

  onXChange = ({ value }) => {
    this.animatedValueX = value;

    this.props.onXChange(value);
  };

  onYChange = ({ value }) => {
    this.animatedValueY = value;

    this.props.onYChange(value);
  };

  onPanResponderMove = (e, { dx, dy }) => {
    console.log(`${dx} - ${dy}`);

    this.pan.setValue({ x: dx, y: dy });
    this.panSwiping.setValue({ x: dx, y: dy });
  };

  onPanResponderGrant = (e, data) => {
    this.props.onPanResponderGrant(e, data);

    this.pan.setValue({ x: 0, y: 0 });
  };

  onPanResponderRelease = (e, data) => {
    const { directions } = this.state;
    const {
      distDrag,
      itemHeight,
      onSwipedTop,
      onSwipedLeft,
      onSwipedRight,
      reduceScaleBy,
      onSwipedBottom,
      stackEffectHeight,
      reduceTransformBy,
    } = this.props;
    const { animatedValueX } = this;
    const { animatedValueY } = this;

    const isSwipingLeft = animatedValueX < -distDrag && directions.left;
    const isSwipingRight = animatedValueX > distDrag && directions.right;
    const isSwipingTop = animatedValueY < -distDrag && directions.top;
    const isSwipingBottom = animatedValueY > distDrag && directions.bottom;

    this.props.onPanResponderRelease(e, data);

    if (isSwipingLeft || isSwipingRight || isSwipingTop || isSwipingBottom) {
      let onSwipeDirectionCallback = onSwipedBottom;

      if (isSwipingRight) {
        onSwipeDirectionCallback = onSwipedRight;
      } else if (isSwipingLeft) {
        onSwipeDirectionCallback = onSwipedLeft;
      } else if (isSwipingTop) {
        onSwipeDirectionCallback = onSwipedTop;
      }

      const scaleRange = 1 - reduceScaleBy;
      const translateRange = (TRANSFORM_RANGE / 2) * reduceTransformBy;
      const scaledHeightDiff = (itemHeight - itemHeight * scaleRange) / 2;
      const zeroRange = scaledHeightDiff * stackEffectHeight;
      const percentage = translateRange / (translateRange + zeroRange);

      Animated.parallel([
        Animated.spring(this.scale, { toValue: 1 }),
        Animated.spring(this.opacity, { toValue: 1 }),
        Animated.spring(this.pan, {
          toValue: { x: 0, y: TRANSFORM_RANGE * (percentage - 1) },
        }),
        Animated.spring(this.panSwiping, {
          toValue: {
            x: this.animatedValueX * 2,
            y: this.animatedValueY * 2,
          },
        }),
      ]).start(() => {
        this.incrementItemIndex(onSwipeDirectionCallback);
      });
    } else {
      Animated.parallel([
        Animated.spring(this.pan, { toValue: { x: 0, y: 0 } }),
        Animated.spring(this.panSwiping, { toValue: { x: 0, y: 0 } }),
      ]).start();
    }
  };

  onMoveShouldSetPanResponder = () => true;

  onStartShouldSetPanResponder = () => true;

  onPanResponderTerminationRequest = () => false;

  onMoveShouldSetPanResponderCapture = () => true;

  onStartShouldSetPanResponderCapture = () => true;

  incrementItemIndex = (onSwipedToDirection) => {
    let newActiveItemIndex = this.activeItemIndex + 1;
    let isStackEnded = false;

    if (newActiveItemIndex === this.props.items.length) {
      newActiveItemIndex = 0;
      isStackEnded = true;
    }

    this.resetPanAndScale();
    this.setItemIndex(newActiveItemIndex, onSwipedToDirection, isStackEnded);
  };

  setItemIndex = (activeItemIndex, onSwipedToDirection, isStackEnded) => {
    this.isStackEnded = isStackEnded;
    this.activeItemIndex = activeItemIndex;

    const prevItemIndex = ElasticStack.calculatePreviousItemIndex(
      this.props.items.length,
      this.activeItemIndex,
    );

    this.props.onSwiped(activeItemIndex);

    onSwipedToDirection(prevItemIndex);

    if (isStackEnded) {
      this.props.onStackEnded();
    }

    this.setState({ activeItemIndex });
  };

  resetPanAndScale = () => {
    this.pan.setValue({ x: 0, y: 0 });
    this.panSwiping.setValue({ x: 0, y: 0 });

    this.scale.setValue(0);
    this.opacity.setValue(0);
  };

  static calculateNextItemIndex = (itemsLength, itemIndex) => itemIndex >= itemsLength - 1 ? itemIndex - (itemsLength - 1) : itemIndex + 1;

  static calculatePreviousItemIndex = (itemsLength, activeItemIndex) => activeItemIndex === 0 ? itemsLength - 1 : activeItemIndex - 1;
}
